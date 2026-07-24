"use client";

import { useOfflineStatus } from "@/lib/hooks/use-offline-status";

export function OfflineBanner() {
  const { online, pendingCount } = useOfflineStatus();

  if (online && pendingCount === 0) return null;

  return (
    <div
      className={`px-4 py-1.5 text-center text-xs font-medium ${
        online
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
          : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
      }`}
    >
      {online
        ? `Syncing ${pendingCount} pending order${pendingCount === 1 ? "" : "s"}…`
        : "Offline — sales are saved locally and will sync when you're back online."}
    </div>
  );
}
