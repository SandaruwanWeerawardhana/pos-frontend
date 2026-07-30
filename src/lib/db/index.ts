import Dexie, { type Table } from "dexie";
import { computeCartTotal } from "@/lib/cart-math";
import type {
  AppNotification,
  CartItem,
  CartTotal,
  CashReconciliation,
  Customer,
  CustomerLedgerEntry,
  Discount,
  HeldCart,
  PaymentMethod,
  PaymentSplit,
  PendingOrder,
  Product,
  PurchaseOrder,
  PurchaseReturn,
  Role,
  StaffUser,
  StockMovement,
  Supplier,
  SyncMetaRecord,
  Warehouse,
} from "@/lib/types";

// Local-first IndexedDB store. Cart + orders are created/edited offline and
// synced later; products are cached from the server for offline lookup.
export class PosDB extends Dexie {
  products!: Table<Product, string>;
  cartItems!: Table<CartItem, number>;
  pendingOrders!: Table<PendingOrder, string>;
  syncMeta!: Table<SyncMetaRecord, string>;
  customers!: Table<Customer, string>;
  suppliers!: Table<Supplier, string>;
  discounts!: Table<Discount, string>;
  heldCarts!: Table<HeldCart, string>;
  cashReconciliations!: Table<CashReconciliation, string>;
  stockMovements!: Table<StockMovement, string>;
  warehouses!: Table<Warehouse, string>;
  purchaseOrders!: Table<PurchaseOrder, string>;
  purchaseReturns!: Table<PurchaseReturn, string>;
  roles!: Table<Role, string>;
  staffUsers!: Table<StaffUser, string>;
  notifications!: Table<AppNotification, string>;
  customerLedger!: Table<CustomerLedgerEntry, string>;

  constructor() {
    super("posDB");
    this.version(1).stores({
      // primary key first, then secondary indexes
      products: "id, name, sku, barcode",
      cartItems: "++id, product_id",
      pendingOrders: "client_generated_id, sync_status, created_at",
      syncMeta: "key",
    });
    // v2: local-only tables with no server counterpart yet (no sync endpoint
    // for these exists - see CLAUDE.md / plan notes on this limitation).
    this.version(2).stores({
      customers: "id, name",
      suppliers: "id, name",
      // "active" is a boolean - not a valid IndexedDB key type, so it's not
      // indexed here; getActiveDiscounts() filters in JS instead.
      discounts: "id",
      heldCarts: "id, created_at",
      cashReconciliations: "id, created_at",
    });
    // v3: grocery catalogue, purchasing, staff, and notification tables.
    // Products gains `category`/`supplier_id` indexes so the POS category
    // filter and supplier drill-downs are index-backed rather than full scans.
    this.version(3)
      .stores({
        products: "id, name, sku, barcode, category, supplier_id",
        stockMovements: "id, product_id, type, created_at",
        warehouses: "id, name",
        purchaseOrders: "id, supplier_id, status, created_at",
        purchaseReturns: "id, purchase_order_id, created_at",
        roles: "id, name",
        staffUsers: "id, email, role_id",
        // "read" is a boolean — not a valid IndexedDB key type — so unread
        // filtering happens in JS, same as discounts.active.
        notifications: "id, kind, created_at",
        customerLedger: "id, customer_id, kind, created_at",
      })
      .upgrade(async (transaction) => {
        // Existing cached products predate the catalogue fields. Give them
        // defaults so list/filter UI never has to special-case undefined.
        await transaction
          .table<Product>("products")
          .toCollection()
          .modify((product) => {
            product.category ??= "Uncategorised";
            product.unit ??= "unit";
            product.reorder_level ??= 5;
          });
      });
  }
}

export const db = new PosDB();

// Refreshes server products while preserving locally-created rows until a
// product-create sync endpoint exists.
export async function seedProducts(products: Product[]): Promise<void> {
  await db.transaction("rw", db.products, async () => {
    const localProducts = await db.products
      .filter((product) => product._local_only === true)
      .toArray();
    await db.products.clear();
    await db.products.bulkPut([...products, ...localProducts]);
  });
}

// Searches name, sku, and barcode against the local table. Works fully offline.
export async function searchProducts(query: string): Promise<Product[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return db.products.toArray();

  return db.products
    .filter(
      (product) =>
        product.name.toLowerCase().includes(needle) ||
        product.sku.toLowerCase().includes(needle) ||
        product.barcode.toLowerCase().includes(needle),
    )
    .toArray();
}

export async function addProduct(product: Product): Promise<void> {
  await db.transaction("rw", db.products, async () => {
    const [existingSku, existingBarcode] = await Promise.all([
      db.products.where("sku").equals(product.sku).first(),
      db.products.where("barcode").equals(product.barcode).first(),
    ]);

    if (existingSku) {
      throw new Error("SKU already exists");
    }

    if (existingBarcode) {
      throw new Error("Barcode already exists");
    }

    await db.products.add({ ...product, _local_only: true });
  });
}

// Sets an absolute stock level and journals the delta as an adjustment so
// the movement history stays complete no matter which screen made the change.
export async function updateProductStock(
  productId: string,
  stockQuantity: number,
  reason = "Manual stock update",
): Promise<void> {
  await db.transaction("rw", db.products, db.stockMovements, async () => {
    const product = await db.products.get(productId);
    if (!product) return;
    const delta = stockQuantity - product.stock_quantity;
    await db.products.update(productId, { stock_quantity: stockQuantity });
    if (delta === 0) return;
    await db.stockMovements.add({
      id: crypto.randomUUID(),
      product_id: productId,
      product_name: product.name,
      type: "adjustment",
      quantity_delta: delta,
      balance_after: stockQuantity,
      reason,
      created_at: Date.now(),
    });
  });
}

export async function getProduct(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

export async function updateProduct(
  productId: string,
  changes: Partial<Omit<Product, "id">>,
): Promise<void> {
  await db.products.update(productId, changes);
}

export async function deleteProduct(productId: string): Promise<void> {
  await db.products.delete(productId);
}

export async function addToCart(product: Product, quantity = 1): Promise<void> {
  await db.transaction("rw", db.cartItems, async () => {
    const existing = await db.cartItems
      .where("product_id")
      .equals(product.id)
      .first();

    if (existing?.id !== undefined) {
      await db.cartItems.update(existing.id, {
        quantity: existing.quantity + quantity,
      });
      return;
    }

    const item: CartItem = {
      product_id: product.id,
      name: product.name,
      quantity,
      unit_price_cents: product.price_cents,
      tax_rate: product.tax_rate,
      ...(product.unit ? { unit: product.unit } : {}),
      ...(product.is_weighted ? { is_weighted: true } : {}),
    };
    await db.cartItems.add(item);
  });
}

export async function removeFromCart(id: number): Promise<void> {
  await db.cartItems.delete(id);
}

export async function updateCartQuantity(id: number, quantity: number): Promise<void> {
  if (quantity <= 0) {
    await db.cartItems.delete(id);
    return;
  }
  await db.cartItems.update(id, { quantity });
}

export async function clearCart(): Promise<void> {
  await db.cartItems.clear();
}

// Subtotal, tax, and grand total in integer cents. Tax is rounded per line
// item to avoid float drift. discountCents, if given, reduces the taxable
// subtotal (tax is reduced proportionally) before totaling.
export async function getCartTotal(discountCents = 0): Promise<CartTotal> {
  const items = await db.cartItems.toArray();
  return computeCartTotal(items, discountCents);
}

// Moves the current cart into a pendingOrders record, optimistically deducts
// stock, and clears the cart. Returns the created order.
export interface CreateOrderOptions {
  customerId?: string;
  discountCents?: number;
  payments?: PaymentSplit[];
  cashierId?: string;
}

// Receipt numbers are per-day sequential and human-readable so a cashier can
// read one back over the phone. Sequence lives in syncMeta, not a counter
// table, and resets when the date part changes.
async function nextReceiptNo(): Promise<string> {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const record = await db.syncMeta.get("receipt_sequence");
  const previous =
    typeof record?.value === "object" && record.value !== null
      ? (record.value as { date: string; seq: number })
      : { date: "", seq: 0 };
  const seq = previous.date === datePart ? previous.seq + 1 : 1;
  await db.syncMeta.put({
    key: "receipt_sequence",
    value: { date: datePart, seq },
  });
  return `R${datePart}-${String(seq).padStart(4, "0")}`;
}

export async function createLocalOrder(
  paymentMethod: PaymentMethod,
  options?: CreateOrderOptions,
): Promise<PendingOrder> {
  return db.transaction(
    "rw",
    [
      db.cartItems,
      db.pendingOrders,
      db.products,
      db.syncMeta,
      db.stockMovements,
      db.customers,
      db.customerLedger,
    ],
    async () => {
      const items = await db.cartItems.toArray();
      const { tax_total_cents, total_cents } = computeCartTotal(
        items,
        options?.discountCents ?? 0,
      );

      const createdAt = Date.now();
      const order: PendingOrder = {
        client_generated_id: crypto.randomUUID(),
        items,
        total_cents,
        tax_total_cents,
        payment_method: paymentMethod,
        created_at: createdAt,
        sync_status: "pending",
        server_id: null,
        receipt_no: await nextReceiptNo(),
        ...(options?.customerId ? { customer_id: options.customerId } : {}),
        ...(options?.discountCents
          ? { discount_cents: options.discountCents }
          : {}),
        ...(options?.payments?.length ? { payments: options.payments } : {}),
        ...(options?.cashierId ? { cashier_id: options.cashierId } : {}),
      };

      await db.pendingOrders.add(order);

      for (const item of items) {
        const product = await db.products.get(item.product_id);
        if (!product) continue;
        const nextStock = Math.max(0, product.stock_quantity - item.quantity);
        await db.products.update(product.id, { stock_quantity: nextStock });
        await db.stockMovements.add({
          id: crypto.randomUUID(),
          product_id: product.id,
          product_name: product.name,
          type: "sale",
          quantity_delta: -item.quantity,
          balance_after: nextStock,
          reference_id: order.client_generated_id,
          created_at: createdAt,
        });
      }

      if (options?.customerId) {
        await accrueLoyaltyForOrder(options.customerId, order);
      }

      await db.cartItems.clear();

      return order;
    },
  );
}

// Awards loyalty points at the configured rate. Runs inside createLocalOrder's
// transaction, so a failure here rolls the whole sale back rather than
// leaving points awarded for an order that was never written.
async function accrueLoyaltyForOrder(
  customerId: string,
  order: PendingOrder,
): Promise<void> {
  const customer = await db.customers.get(customerId);
  if (!customer) return;

  const settingsRecord = await db.syncMeta.get("store_settings");
  const pointsPerUnit =
    typeof settingsRecord?.value === "object" && settingsRecord.value !== null
      ? ((settingsRecord.value as Record<string, unknown>)
          .loyalty_points_per_currency_unit as number | undefined)
      : undefined;
  const rate = typeof pointsPerUnit === "number" ? pointsPerUnit : 1;
  const points = Math.floor((order.total_cents / 100) * rate);
  if (points <= 0) return;

  await db.customers.update(customerId, {
    loyalty_points: (customer.loyalty_points ?? 0) + points,
  });
  await db.customerLedger.add({
    id: crypto.randomUUID(),
    customer_id: customerId,
    kind: "loyalty",
    delta: points,
    reason: "Sale",
    order_id: order.client_generated_id,
    created_at: order.created_at,
  });
}

// Distinct category names present in the local catalogue, for filter chips.
export async function listCategories(): Promise<string[]> {
  const products = await db.products.toArray();
  const names = new Set<string>();
  for (const product of products) {
    names.add(product.category?.trim() || "Uncategorised");
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

// Distinct subcategory names, optionally narrowed to one parent category so
// the subcategory picker only offers siblings of the chosen category.
export async function listSubcategories(category?: string): Promise<string[]> {
  const products = await db.products.toArray();
  const names = new Set<string>();
  for (const product of products) {
    if (!product.subcategory?.trim()) continue;
    if (category && (product.category ?? "") !== category) continue;
    names.add(product.subcategory.trim());
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

export async function listBranches(): Promise<string[]> {
  const products = await db.products.toArray();
  const names = new Set<string>();
  for (const product of products) {
    if (product.branch?.trim()) names.add(product.branch.trim());
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

// Uniqueness probes for the product form. `addProduct` re-checks inside its
// transaction — these exist so the form can report a clash inline while the
// user is still typing, rather than only on submit.
export async function isSkuTaken(sku: string, exceptId?: string): Promise<boolean> {
  const needle = sku.trim();
  if (!needle) return false;
  const match = await db.products.where("sku").equals(needle).first();
  return match !== undefined && match.id !== exceptId;
}

export async function isBarcodeTaken(
  barcode: string,
  exceptId?: string,
): Promise<boolean> {
  const needle = barcode.trim();
  if (!needle) return false;
  const match = await db.products.where("barcode").equals(needle).first();
  return match !== undefined && match.id !== exceptId;
}

export async function listBrands(): Promise<string[]> {
  const products = await db.products.toArray();
  const names = new Set<string>();
  for (const product of products) {
    if (product.brand?.trim()) names.add(product.brand.trim());
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

// Persisted once on first access, never changed after that.
export async function getDeviceId(): Promise<string> {
  const existing = await db.syncMeta.get("device_id");
  if (existing && typeof existing.value === "string") return existing.value;

  const deviceId = crypto.randomUUID();
  await db.syncMeta.put({ key: "device_id", value: deviceId });
  return deviceId;
}

export async function getLastSyncedAt(): Promise<number | null> {
  const record = await db.syncMeta.get("last_synced_at");
  return typeof record?.value === "number" ? record.value : null;
}

export async function setLastSyncedAt(timestamp: number): Promise<void> {
  await db.syncMeta.put({ key: "last_synced_at", value: timestamp });
}

export * from "./customers";
export * from "./suppliers";
export * from "./discounts";
export * from "./held-carts";
export * from "./cash-reconciliation";
export * from "./inventory";
export * from "./purchases";
export * from "./users";
export * from "./notifications";
export * from "./settings";
export * from "./reports";
