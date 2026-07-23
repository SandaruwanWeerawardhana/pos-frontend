import { api } from "@/lib/api";
import { db } from "@/lib/db";

// Background reconciliation between IndexedDB and the server.
export class SyncManager {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly intervalMs = 15_000) {}

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.syncOnce(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async syncOnce() {
    await this.pushPendingOrders();
    await this.pullProducts();
  }

  // Push locally-created orders that haven't reached the server yet.
  async pushPendingOrders() {
    const pending = await db.pendingOrders
      .where("sync_status")
      .equals("pending")
      .toArray();

    for (const order of pending) {
      try {
        await db.pendingOrders.update(order.client_generated_id, {
          sync_status: "syncing",
        });
        await api.createOrder(order);
        await db.pendingOrders.update(order.client_generated_id, {
          sync_status: "synced",
        });
      } catch {
        await db.pendingOrders.update(order.client_generated_id, {
          sync_status: "error",
        });
      }
    }
  }

  // Refresh the local product cache from the server.
  async pullProducts() {
    try {
      const products = await api.getProducts();
      await db.products.bulkPut(products);
    } catch {
      // surface fetch errors to the connection status store.
    }
  }
}

export const syncManager = new SyncManager();
