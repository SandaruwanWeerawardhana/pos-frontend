"use client";

import { useEffect, useState } from "react";
import { db, getTodaysOrderSummary, type TodaysOrderSummary } from "@/lib/db";
import { useSyncStatus } from "@/lib/sync/use-sync-status";
import { PluginDashboardWidget } from "@/components/plugin-slots/PluginDashboardWidget";
import Link from "next/link";
import { ROUTES } from "@/lib/types/routes";
import {
  DollarSign,
  ShoppingBag,
  Package,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  Monitor,
  List,
  BarChart2,
  Users,
  CheckCircle2,
} from "lucide-react";

const LOW_STOCK_THRESHOLD = 5;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
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
function QuickAction({
  label,
  icon,
  href,
}: {
  label: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-surface-container-low hover:shadow-elevated dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-blue-700/40 dark:hover:bg-zinc-800"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-400">
        {icon}
      </span>
      <span className="text-xs font-medium text-on-surface dark:text-zinc-200">{label}</span>
    </Link>
  );
}

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
  const [todayLabel, setTodayLabel] = useState<{
    greeting: string;
    dateStr: string;
  } | null>(null);
  const { pendingCount, conflictCount } = useSyncStatus();

  useEffect(() => {
    getTodaysOrderSummary().then(setSummary);
    db.products
      .filter((product) => product.stock_quantity <= LOW_STOCK_THRESHOLD)
      .count()
      .then(setLowStockCount);
  }, []);

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();

    setTodayLabel({
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
    });
  }, []);

  return (
    <div className="flex flex-col gap-8 pb-8">
      {/* Hero header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-on-surface dark:text-zinc-50">
          {todayLabel?.greeting ?? "Welcome back"}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant dark:text-zinc-400">
          {todayLabel?.dateStr ?? "Loading dashboard"}
        </p>
      </div>

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
      </section>

      {/* Sync status */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Sync status" />
        <SyncPanel pendingCount={pendingCount} conflictCount={conflictCount} />
      </section>

      {/* Quick actions */}
      <section className="flex flex-col gap-3">
        <SectionHeader title="Quick access" action="All modules" href={ROUTES.dashboard} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction label="POS Terminal" icon={<Monitor size={20} />} href={ROUTES.pos.root} />
          <QuickAction label="Inventory" icon={<List size={20} />} href={ROUTES.inventory.root} />
          <QuickAction label="Reports" icon={<BarChart2 size={20} />} href={ROUTES.reports} />
          <QuickAction label="Customers" icon={<Users size={20} />} href={ROUTES.customers.root} />
        </div>
      </section>

      {/* Plugin widgets */}
      <PluginDashboardWidget />
    </div>
  );
}
