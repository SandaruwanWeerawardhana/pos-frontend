import Dexie, { type Table } from "dexie";
import type { Order, Product } from "@/lib/types";

// Local-first IndexedDB store. Orders are created offline and synced later;
// products are cached from the server for offline lookup.
export class PosDB extends Dexie {
  products!: Table<Product, string>;
  orders!: Table<Order, string>;

  constructor() {
    super("pos");
    this.version(1).stores({
      // primary key first, then secondary indexes
      products: "id, sku, barcode",
      orders: "client_generated_id, status, sync_status, created_at",
    });
  }
}

export const db = new PosDB();
