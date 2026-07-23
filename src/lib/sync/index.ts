import { apiClient } from "@/lib/api";
import { db } from "@/lib/db";
import type { SyncOrderResult } from "@/lib/api";
import type { SyncStatus } from "@/lib/types";

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

    if (pending.length === 0) return;

    const ids = pending.map((order) => order.client_generated_id);
    await db.pendingOrders.bulkUpdate(
      ids.map((client_generated_id) => ({
        key: client_generated_id,
        changes: { sync_status: "syncing" satisfies SyncStatus },
      })),
    );

    try {
      const { results } = await apiClient.syncOrders(pending);
      await db.pendingOrders.bulkUpdate(
        results.map(({ client_generated_id, result, server_id }) => ({
          key: client_generated_id,
          changes: {
            sync_status: mapSyncResultToStatus(result),
            ...(server_id ? { server_id } : {}),
          },
        })),
      );
    } catch {
      // TODO: retry/backoff; mark error for now.
      await db.pendingOrders.bulkUpdate(
        ids.map((client_generated_id) => ({
          key: client_generated_id,
          changes: { sync_status: "error" satisfies SyncStatus },
        })),
      );
    }
  }

  // Refresh the local product cache from the server.
  async pullProducts() {
    try {
      const products = await apiClient.getProducts();
      await db.products.bulkPut(products);
    } catch {
      // surface fetch errors to the connection status store.
    }
  }
}

function mapSyncResultToStatus(result: SyncOrderResult): SyncStatus {
  switch (result) {
    case "synced":
    case "already_synced":
      return "synced";
    case "conflict":
      return "conflict";
    case "error":
      return "error";
  }
}

export const syncManager = new SyncManager();
