import Dexie, { type Table } from "dexie";
import { computeCartTotal } from "@/lib/cart-math";
import type {
  CartItem,
  CartTotal,
  CashReconciliation,
  Customer,
  Discount,
  HeldCart,
  PaymentMethod,
  PendingOrder,
  Product,
  Supplier,
  SyncMetaRecord,
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

export async function updateProductStock(
  productId: string,
  stockQuantity: number,
): Promise<void> {
  await db.products.update(productId, { stock_quantity: stockQuantity });
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
export async function createLocalOrder(
  paymentMethod: PaymentMethod,
  options?: { customerId?: string; discountCents?: number },
): Promise<PendingOrder> {
  return db.transaction(
    "rw",
    db.cartItems,
    db.pendingOrders,
    db.products,
    async () => {
      const items = await db.cartItems.toArray();
      const { tax_total_cents, total_cents } = computeCartTotal(
        items,
        options?.discountCents ?? 0,
      );

      const order: PendingOrder = {
        client_generated_id: crypto.randomUUID(),
        items,
        total_cents,
        tax_total_cents,
        payment_method: paymentMethod,
        created_at: Date.now(),
        sync_status: "pending",
        server_id: null,
        ...(options?.customerId ? { customer_id: options.customerId } : {}),
        ...(options?.discountCents
          ? { discount_cents: options.discountCents }
          : {}),
      };

      await db.pendingOrders.add(order);

      for (const item of items) {
        const product = await db.products.get(item.product_id);
        if (product) {
          const nextStock = Math.max(0, product.stock_quantity - item.quantity);
          await db.products.update(product.id, { stock_quantity: nextStock });
        }
      }

      await db.cartItems.clear();

      return order;
    },
  );
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
