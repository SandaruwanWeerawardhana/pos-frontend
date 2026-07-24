"use client";

import { useSyncStatus } from "@/lib/sync/use-sync-status";

export function SyncStatusDot() {
  const { pendingCount, conflictCount } = useSyncStatus();

  const state =
    conflictCount > 0 ? "conflict" : pendingCount > 0 ? "pending" : "synced";

  const dotClass = {
    conflict: "bg-amber-500",
    pending: "bg-zinc-400",
    synced: "bg-green-500",
  }[state];

  const label = {
    conflict: `${conflictCount} conflict${conflictCount === 1 ? "" : "s"}`,
    pending: `${pendingCount} pending`,
    synced: "Synced",
  }[state];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {label}
    </span>
  );
}
