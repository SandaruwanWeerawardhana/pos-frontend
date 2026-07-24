"use client";

import { useEffect, useState } from "react";
import { db, getTodaysOrderSummary, type TodaysOrderSummary } from "@/lib/db";
import { useSyncStatus } from "@/lib/sync/use-sync-status";
import { PluginDashboardWidget } from "@/components/plugin-slots/PluginDashboardWidget";

const LOW_STOCK_THRESHOLD = 5;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<TodaysOrderSummary | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const { pendingCount, conflictCount } = useSyncStatus();

  useEffect(() => {
    getTodaysOrderSummary().then(setSummary);
    db.products
      .filter((product) => product.stock_quantity <= LOW_STOCK_THRESHOLD)
      .count()
      .then(setLowStockCount);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        Dashboard
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Sales today"
          value={summary ? formatCents(summary.totalCents) : "…"}
        />
        <StatTile
          label="Orders today"
          value={summary ? String(summary.orderCount) : "…"}
        />
        <StatTile
          label="Low stock items"
          value={lowStockCount === null ? "…" : String(lowStockCount)}
        />
        <StatTile
          label="Pending sync"
          value={String(pendingCount)}
        />
        {conflictCount > 0 && (
          <StatTile label="Conflicts" value={String(conflictCount)} />
        )}
        <PluginDashboardWidget />
      </div>
    </div>
  );
}
