import Dexie, { type Table } from "dexie";
import type {
  CartItem,
  CartTotal,
  PaymentMethod,
  PendingOrder,
  Product,
  SyncMetaRecord,
} from "@/lib/types";

// Local-first IndexedDB store. Cart + orders are created/edited offline and
// synced later; products are cached from the server for offline lookup.
export class PosDB extends Dexie {
  products!: Table<Product, string>;
  cartItems!: Table<CartItem, number>;
  pendingOrders!: Table<PendingOrder, string>;
  syncMeta!: Table<SyncMetaRecord, string>;

  constructor() {
    super("posDB");
    this.version(1).stores({
      // primary key first, then secondary indexes
      products: "id, name, sku, barcode",
      cartItems: "++id, product_id",
      pendingOrders: "client_generated_id, sync_status, created_at",
      syncMeta: "key",
    });
  }
}

export const db = new PosDB();

// Bulk-replaces the local product catalog. Used when pulling products from the server.
export async function seedProducts(products: Product[]): Promise<void> {
  await db.transaction("rw", db.products, async () => {
    await db.products.clear();
    await db.products.bulkAdd(products);
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
// item to avoid float drift.
export async function getCartTotal(): Promise<CartTotal> {
  const items = await db.cartItems.toArray();
  return computeCartTotal(items);
}

function computeCartTotal(items: CartItem[]): CartTotal {
  const subtotal_cents = items.reduce(
    (sum, item) => sum + item.unit_price_cents * item.quantity,
    0,
  );
  const tax_total_cents = items.reduce(
    (sum, item) =>
      sum + Math.round(item.unit_price_cents * item.quantity * item.tax_rate),
    0,
  );
  return {
    subtotal_cents,
    tax_total_cents,
    total_cents: subtotal_cents + tax_total_cents,
  };
}

// Moves the current cart into a pendingOrders record, optimistically deducts
// stock, and clears the cart. Returns the created order.
export async function createLocalOrder(
  paymentMethod: PaymentMethod,
): Promise<PendingOrder> {
  return db.transaction(
    "rw",
    db.cartItems,
    db.pendingOrders,
    db.products,
    async () => {
      const items = await db.cartItems.toArray();
      const { tax_total_cents, total_cents } = computeCartTotal(items);

      const order: PendingOrder = {
        client_generated_id: crypto.randomUUID(),
        items,
        total_cents,
        tax_total_cents,
        payment_method: paymentMethod,
        created_at: Date.now(),
        sync_status: "pending",
        server_id: null,
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
