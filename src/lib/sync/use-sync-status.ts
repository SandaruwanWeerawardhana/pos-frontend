"use client";

import { useCallback, useEffect, useState } from "react";
import { liveQuery } from "dexie";
import { db } from "@/lib/db";
import { syncManager } from "./index";

export interface SyncStatusSummary {
  pendingCount: number;
  conflictCount: number;
  lastSyncedAt: number | null;
  triggerSync: () => Promise<void>;
}

// Reactive view over pendingOrders + syncMeta, backed by Dexie's liveQuery
// so it updates as SyncManager (or the cart) writes to those tables.
export function useSyncStatus(): SyncStatusSummary {
  const [pendingCount, setPendingCount] = useState(0);
  const [conflictCount, setConflictCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAtState] = useState<number | null>(null);

  useEffect(() => {
    const countsSubscription = liveQuery(async () => {
      const [pending, syncing, error, conflict] = await Promise.all([
        db.pendingOrders.where("sync_status").equals("pending").count(),
        db.pendingOrders.where("sync_status").equals("syncing").count(),
        db.pendingOrders.where("sync_status").equals("error").count(),
        db.pendingOrders.where("sync_status").equals("conflict").count(),
      ]);
      return { pendingCount: pending + syncing + error, conflictCount: conflict };
    }).subscribe({
      next: (counts) => {
        setPendingCount(counts.pendingCount);
        setConflictCount(counts.conflictCount);
      },
    });

    const lastSyncedSubscription = liveQuery(() =>
      db.syncMeta.get("last_synced_at"),
    ).subscribe({
      next: (record) => {
        setLastSyncedAtState(typeof record?.value === "number" ? record.value : null);
      },
    });

    return () => {
      countsSubscription.unsubscribe();
      lastSyncedSubscription.unsubscribe();
    };
  }, []);

  const triggerSync = useCallback(() => syncManager.triggerSync(), []);

  return { pendingCount, conflictCount, lastSyncedAt, triggerSync };
}
