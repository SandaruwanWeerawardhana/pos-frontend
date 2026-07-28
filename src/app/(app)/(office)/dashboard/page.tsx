"use client";

import { useEffect, useMemo, useState } from "react";
import { db, getTodaysOrderSummary, type TodaysOrderSummary } from "@/lib/db";
import { useSyncStatus } from "@/lib/sync/use-sync-status";
import { PluginDashboardWidget } from "@/components/plugin-slots/PluginDashboardWidget";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Package,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;
const DAILY_REVENUE_DAYS = 7;

interface DailyRevenuePoint {
  date: string;
  label: string;
  revenueCents: number;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getDefaultDailyRevenue(): DailyRevenuePoint[] {
  const today = new Date();
  return Array.from({ length: DAILY_REVENUE_DAYS }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (DAILY_REVENUE_DAYS - 1 - index));
    return {
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      revenueCents: 0,
    };
  });
}

function buildDailyRevenue(
  orders: { created_at: number; total_cents: number }[],
): DailyRevenuePoint[] {
  const points = getDefaultDailyRevenue();
  const revenueByDate = new Map(points.map((point) => [point.date, 0]));

  for (const order of orders) {
    const date = new Date(order.created_at).toISOString().slice(0, 10);
    if (revenueByDate.has(date)) {
      revenueByDate.set(date, (revenueByDate.get(date) ?? 0) + order.total_cents);
    }
  }

  return points.map((point) => ({
    ...point,
    revenueCents: revenueByDate.get(point.date) ?? 0,
  }));
}

function chartPoints(values: number[], width = 720, height = 150): string {
  const max = Math.max(...values, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - (value / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function DailyRevenueChart({ points }: { points: DailyRevenuePoint[] }) {
  const values = points.map((point) => point.revenueCents);
  const coordinates = chartPoints(values)
    .split(" ")
    .map((point) => point.split(",").map(Number));
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-on-surface dark:text-zinc-50">
            Daily revenue
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant dark:text-zinc-400">
            Default view: last {DAILY_REVENUE_DAYS} days sales
          </p>
        </div>
        <p className="text-right text-sm font-semibold text-on-surface dark:text-zinc-50">
          {formatCents(total)}
        </p>
      </div>
      <svg
        viewBox="0 0 720 190"
        className="h-56 w-full overflow-visible"
        role="img"
        aria-label={`Daily revenue line chart for last ${DAILY_REVENUE_DAYS} days`}
      >
        {[38, 76, 114, 152].map((y) => (
          <line
            key={y}
            x1="0"
            x2="720"
            y1={y}
            y2={y}
            className="stroke-outline-variant/60 dark:stroke-zinc-800"
            strokeDasharray="4 6"
          />
        ))}
        <polyline
          fill="none"
          points={chartPoints(values)}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="4"
          className="text-primary dark:text-blue-400"
        />
        {points.map((point, index) => {
          const [x, y] = coordinates[index];
          return (
            <g key={point.date}>
              <circle
                cx={x}
                cy={y}
                r="4"
                className="fill-surface-container-lowest stroke-primary dark:fill-zinc-900 dark:stroke-blue-400"
                strokeWidth="3"
              />
              <text
                x={x}
                y="185"
                textAnchor="middle"
                className="fill-on-surface-variant text-[10px] dark:fill-zinc-400"
              >
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: "primary" | "secondary" | "warning" | "error";
  trend?: boolean;
  sub?: string;
}

function StatCard({ label, value, icon, accent, trend, sub }: StatCardProps) {
  const iconBg: Record<string, string> = {
    primary: "bg-primary text-on-primary",
    secondary: "bg-secondary text-on-secondary",
    warning: "bg-[#004b1e] text-[#22c55e]",
    error: "bg-error text-on-error",
  };

  return (
    <div className="group relative flex flex-col gap-4 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg[accent]}`}>
          {icon}
        </span>
        {trend && (
          <span className="flex items-center gap-1 rounded-full bg-[#004b1e] px-2 py-0.5 text-xs font-bold text-[#bbf7d0] dark:bg-green-900/40 dark:text-green-400">
            <TrendingUp size={12} />
            Today
          </span>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tight text-on-surface dark:text-zinc-50">
          {value}
        </p>
        <p className="mt-0.5 text-sm text-on-surface-variant dark:text-zinc-400">{label}</p>
        {sub && (
          <p className="mt-1 text-xs text-on-surface-variant/60 dark:text-zinc-500">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Section header ──────────────────────────────────────────────────────────
function SectionHeader({
  title,
  action,
  href,
}: {
  title: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500">
        {title}
      </h2>
      {action && href && (
        <Link
          href={href}
          className="flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:underline dark:text-blue-400"
        >
          {action}
          <ChevronRight size={13} />
        </Link>
      )}
    </div>
  );
}

// ── Quick action ────────────────────────────────────────────────────────────
// ── Sync status panel ───────────────────────────────────────────────────────
function SyncPanel({
  pendingCount,
  conflictCount,
}: {
  pendingCount: number;
  conflictCount: number;
}) {
  const hasIssues = pendingCount > 0 || conflictCount > 0;

  const isConflict = conflictCount > 0;
  const isPending = !isConflict && pendingCount > 0;
  const isOk = !isConflict && !isPending;

  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-5 transition-colors ${
        isConflict
          ? "border-error/30 bg-error-container/10 dark:border-red-800/40 dark:bg-red-950/20"
          : isPending
          ? "border-outline-variant bg-surface-container-lowest dark:border-zinc-800 dark:bg-zinc-900"
          : "border-[#004b1e] bg-[#004b1e]/8 dark:border-green-800/40 dark:bg-green-950/10"
      }`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isConflict
            ? "bg-error text-on-error"
            : isPending
            ? "bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-400"
            : "bg-[#004b1e] text-[#4ade80] dark:bg-green-900/40 dark:text-green-400"
        }`}
      >
        {isConflict ? (
          <AlertTriangle size={18} />
        ) : isOk ? (
          <CheckCircle2 size={18} />
        ) : (
          <RefreshCw size={18} />
        )}
      </span>

      <div className="flex-1">
        <p className="text-sm font-semibold text-on-surface dark:text-zinc-100">
          {isConflict
            ? `${conflictCount} sync conflict${conflictCount > 1 ? "s" : ""} need attention`
            : isPending
            ? `${pendingCount} record${pendingCount > 1 ? "s" : ""} pending sync`
            : "All data synced"}
        </p>
        <p className="mt-0.5 text-xs text-on-surface-variant dark:text-zinc-400">
          {isConflict
            ? "Review conflicts to prevent data loss"
            : isPending
            ? "Will sync automatically when connection restores"
            : "Your local data is up to date with the server"}
        </p>
      </div>

      {hasIssues && (
        <span
          className={`flex h-6 min-w-[1.5rem] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
            isConflict ? "bg-error text-on-error" : "bg-primary text-on-primary"
          }`}
        >
          {isConflict ? conflictCount : pendingCount}
        </span>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [summary, setSummary] = useState<TodaysOrderSummary | null>(null);
  const [lowStockCount, setLowStockCount] = useState<number | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenuePoint[]>(() =>
    getDefaultDailyRevenue(),
  );
  const { pendingCount, conflictCount } = useSyncStatus();
  const todayLabel = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    return {
      greeting:
        hour < 12
          ? "Good morning"
          : hour < 17
          ? "Good afternoon"
          : "Good evening",
      dateStr: now.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  }, []);

  useEffect(() => {
    getTodaysOrderSummary().then(setSummary);
    db.products
      .filter((product) => product.stock_quantity <= LOW_STOCK_THRESHOLD)
      .count()
      .then(setLowStockCount);
    db.pendingOrders.toArray().then((orders) => {
      setDailyRevenue(buildDailyRevenue(orders));
    });
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-8">      
      {/* KPI grid */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Today's overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Revenue today"
            value={summary ? formatCents(summary.totalCents) : "—"}
            icon={<DollarSign size={20} />}
            accent="primary"
            trend
            sub="All completed orders"
          />
          <StatCard
            label="Orders today"
            value={summary ? String(summary.orderCount) : "—"}
            icon={<ShoppingBag size={20} />}
            accent="secondary"
            trend
            sub="Processed & completed"
          />
          <StatCard
            label="Low stock items"
            value={lowStockCount === null ? "—" : String(lowStockCount)}
            icon={<Package size={20} />}
            accent={lowStockCount !== null && lowStockCount > 0 ? "warning" : "secondary"}
            sub={`≤ ${LOW_STOCK_THRESHOLD} units remaining`}
          />
          <StatCard
            label="Pending sync"
            value={String(pendingCount)}
            icon={<RefreshCw size={20} />}
            accent={pendingCount > 0 ? "warning" : "secondary"}
            sub="Records awaiting upload"
          />
        </div>
        <DailyRevenueChart points={dailyRevenue} />
      </section>

      {/* Sync status */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Sync status" />
        <SyncPanel pendingCount={pendingCount} conflictCount={conflictCount} />
      </section>

      {/* Plugin widgets */}
      <PluginDashboardWidget />
    </div>
  );
}
