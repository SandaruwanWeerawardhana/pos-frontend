import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db, getLastSyncedAt } from "@/lib/db";
import { mockApi } from "@/lib/api/mock";
import type { PendingOrder } from "@/lib/types";
import { SyncManager } from "./index";

function makePendingOrder(id: string): PendingOrder {
  return {
    client_generated_id: id,
    items: [],
    total_cents: 1000,
    tax_total_cents: 80,
    payment_method: "cash",
    created_at: Date.now(),
    sync_status: "pending",
    server_id: null,
  };
}

beforeEach(async () => {
  await Promise.all([
    db.products.clear(),
    db.cartItems.clear(),
    db.pendingOrders.clear(),
    db.syncMeta.clear(),
  ]);
  mockApi.setNextSyncResult(null);
  mockApi.setSyncDelay(10);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SyncManager.syncOnce", () => {
  it("syncs pending orders and records server_id + lastSyncedAt", async () => {
    await db.pendingOrders.bulkAdd([
      makePendingOrder("success-1"),
      makePendingOrder("success-2"),
    ]);

    const manager = new SyncManager();
    await manager.syncOnce();

    const orders = await db.pendingOrders.toArray();
    expect(orders).toHaveLength(2);
    for (const order of orders) {
      expect(order.sync_status).toBe("synced");
      expect(order.server_id).toBe(`srv_${order.client_generated_id}`);
    }

    const lastSyncedAt = await getLastSyncedAt();
    expect(lastSyncedAt).not.toBeNull();
  });

  it("marks an order 'conflict' and keeps it for UI review when the server reports a conflict", async () => {
    await db.pendingOrders.add(makePendingOrder("conflict-1"));
    mockApi.setNextSyncResult("conflict");

    const manager = new SyncManager();
    await manager.syncOnce();

    const order = await db.pendingOrders.get("conflict-1");
    expect(order?.sync_status).toBe("conflict");
    expect(order?.server_id).toBeNull();
  });

  it("marks a forced error 'error' and retries it successfully on the next cycle", async () => {
    await db.pendingOrders.add(makePendingOrder("error-retry-1"));
    mockApi.setNextSyncResult("error");

    const manager = new SyncManager();
    await manager.syncOnce();

    let order = await db.pendingOrders.get("error-retry-1");
    expect(order?.sync_status).toBe("error");

    // Next cycle: no forced result this time, so the retry should succeed.
    await manager.syncOnce();

    order = await db.pendingOrders.get("error-retry-1");
    expect(order?.sync_status).toBe("synced");
    expect(order?.server_id).toBe("srv_error-retry-1");
  });

  it("does not re-send orders already claimed 'syncing' by a concurrent run", async () => {
    const ids = ["dup-1", "dup-2", "dup-3"];
    await db.pendingOrders.bulkAdd(ids.map(makePendingOrder));

    const syncOrdersSpy = vi.spyOn(mockApi, "syncOrders");

    const managerA = new SyncManager();
    const managerB = new SyncManager();
    await Promise.all([managerA.syncOnce(), managerB.syncOnce()]);

    const sentIds = syncOrdersSpy.mock.calls.flatMap(([orders]) =>
      orders.map((order) => order.client_generated_id),
    );

    expect(new Set(sentIds).size).toBe(sentIds.length);
    expect([...sentIds].sort()).toEqual([...ids].sort());

    const orders = await db.pendingOrders.toArray();
    for (const order of orders) {
      expect(order.sync_status).toBe("synced");
    }
  });
});
