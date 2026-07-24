import { apiClient, type SyncOrderResult } from "@/lib/api";
import { db, seedProducts, setLastSyncedAt } from "@/lib/db";
import type { PendingOrder, SyncStatus } from "@/lib/types";
import { SYNC_CONFIG } from "@/lib/types/sync.config";
import { useConnectionStore } from "@/lib/store/connection";

const BASE_INTERVAL_MS: number = SYNC_CONFIG.baseIntervalMs;
const MAX_BACKOFF_MS: number = SYNC_CONFIG.maxBackoffMs;
const MAX_BATCH_SIZE: number = SYNC_CONFIG.maxBatchSize;
const SYNCABLE_STATUSES: SyncStatus[] = ["pending", "error"];

// Atomically claims up to maxBatchSize syncable orders by flipping them to
// "syncing" inside the same transaction that reads them. This is what
// prevents a second concurrent sync run (e.g. the 30s tick firing right as
// an online-transition run is still in flight) from picking up and
// double-sending the same orders - once claimed, a row is no longer
// "pending"/"error" so a concurrent read simply won't see it.
async function claimBatch(maxBatchSize: number): Promise<PendingOrder[]> {
  return db.transaction("rw", db.pendingOrders, async () => {
    const batch = await db.pendingOrders
      .where("sync_status")
      .anyOf(SYNCABLE_STATUSES)
      .limit(maxBatchSize)
      .toArray();

    if (batch.length === 0) return [];

    await db.pendingOrders.bulkUpdate(
      batch.map((order) => ({
        key: order.client_generated_id,
        changes: { sync_status: "syncing" satisfies SyncStatus },
      })),
    );

    return batch;
  });
}

// A "syncing" claim only lives for the duration of one in-process run, so any
// order still marked "syncing" at startup was orphaned by a reload or crash
// mid-push. Nothing would ever pick those up again (they're neither "pending"
// nor "error"), so release them back to "pending" before the first cycle.
async function releaseOrphanedClaims(): Promise<void> {
  await db.pendingOrders
    .where("sync_status")
    .equals("syncing")
    .modify({ sync_status: "pending" satisfies SyncStatus });
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
    default:
      return "error";
  }
}

// Background reconciliation between IndexedDB and the server.
export class SyncManager {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeConnection: (() => void) | null = null;
  private running = false;
  private failureStreak = 0;

  constructor(
    private readonly intervalMs = BASE_INTERVAL_MS,
    private readonly maxBackoffMs = MAX_BACKOFF_MS,
    private readonly maxBatchSize = MAX_BATCH_SIZE,
  ) {}

  // Runs immediately if already online, then re-runs on a timer while
  // online, and on every offline -> online transition.
  start() {
    if (this.unsubscribeConnection) return; // already started

    this.unsubscribeConnection = useConnectionStore.subscribe((curr, prev) => {
      if (curr.online === prev.online) return;
      if (curr.online) {
        this.failureStreak = 0;
        this.scheduleNext(0);
      } else {
        this.clearTimer();
      }
    });

    // Recover orphaned claims before the first cycle so they're visible as
    // "pending" to the very first claimBatch() rather than a cycle later.
    void releaseOrphanedClaims().finally(() => {
      if (!this.unsubscribeConnection) return; // stopped while recovering
      if (useConnectionStore.getState().online) {
        this.scheduleNext(0);
      }
    });
  }

  stop() {
    this.clearTimer();
    this.unsubscribeConnection?.();
    this.unsubscribeConnection = null;
  }

  // Manual trigger for the useSyncStatus() hook's triggerSync().
  async triggerSync(): Promise<void> {
    await this.syncOnce();
  }

  private clearTimer() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private scheduleNext(delayMs: number) {
    this.clearTimer();
    this.timer = setTimeout(() => {
      void this.syncOnce().finally(() => {
        if (useConnectionStore.getState().online) {
          this.scheduleNext(this.nextDelayMs());
        }
      });
    }, delayMs);
  }

  // Exponential backoff so a downed server doesn't get hammered every 30s
  // forever - resets to the base interval as soon as a sync call succeeds.
  private nextDelayMs(): number {
    if (this.failureStreak === 0) return this.intervalMs;
    return Math.min(this.intervalMs * 2 ** this.failureStreak, this.maxBackoffMs);
  }

  async syncOnce(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.pushPendingOrders();
      this.failureStreak = 0;
      await this.pullProducts();
      await setLastSyncedAt(Date.now());
    } catch {
      this.failureStreak += 1;
    } finally {
      this.running = false;
    }
  }

  // Claims a batch of pending/error orders and pushes them to the server.
  private async pushPendingOrders(): Promise<void> {
    const batch = await claimBatch(this.maxBatchSize);
    if (batch.length === 0) return;

    try {
      const { results } = await apiClient.syncOrders(batch);
      await db.pendingOrders.bulkUpdate(
        results.map(({ client_generated_id, result, server_id }) => ({
          key: client_generated_id,
          changes: {
            sync_status: mapSyncResultToStatus(result),
            ...(server_id ? { server_id } : {}),
          },
        })),
      );
    } catch (error) {
      // Transport-level failure (server unreachable): release the claim so
      // these orders are retried next cycle, and let the caller back off.
      await db.pendingOrders.bulkUpdate(
        batch.map((order) => ({
          key: order.client_generated_id,
          changes: { sync_status: "error" satisfies SyncStatus },
        })),
      );
      throw error;
    }
  }

  // Refresh the local product cache from the server.
  private async pullProducts(): Promise<void> {
    try {
      const products = await apiClient.getProducts();
      await seedProducts(products);
    } catch {
      // non-fatal: a stale product cache shouldn't back off order syncing.
    }
  }
}

export const syncManager = new SyncManager();
