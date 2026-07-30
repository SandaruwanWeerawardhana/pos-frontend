"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Monitor,
  Moon,
  Package,
  PackagePlus,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Users,
} from "lucide-react";
import {
  db,
  getInventoryAlerts,
  getTodaysOrderSummary,
  listStockMovements,
  type InventoryAlerts,
  type TodaysOrderSummary,
} from "@/lib/db";
import { useSyncStatus } from "@/lib/sync/use-sync-status";
import { useSettings } from "@/lib/hooks/use-settings";
import { PluginDashboardWidget } from "@/components/plugin-slots/PluginDashboardWidget";
import { Card, SectionHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { PendingOrder, StockMovement } from "@/lib/types";
import { ROUTES } from "@/lib/types/routes";

const DAILY_REVENUE_DAYS = 7;

interface DailyRevenuePoint {
  date: string;
  label: string;
  revenueCents: number;
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

function buildDailyRevenue(orders: PendingOrder[]): DailyRevenuePoint[] {
  const points = getDefaultDailyRevenue();
  const revenueByDate = new Map(points.map((point) => [point.date, 0]));

  for (const order of orders) {
    if (order.refunded) continue;
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

function DailyRevenueChart({
  points,
  money,
}: Readonly<{ points: DailyRevenuePoint[]; money: (cents: number) => string }>) {
  const values = points.map((point) => point.revenueCents);
  const coordinates = chartPoints(values)
    .split(" ")
    .map((point) => point.split(",").map(Number));
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-on-surface dark:text-zinc-50">
            Daily revenue
          </h3>
          <p className="mt-1 text-xs text-on-surface-variant dark:text-zinc-400">
            Last {DAILY_REVENUE_DAYS} days
          </p>
        </div>
        <p className="text-right text-sm font-semibold text-on-surface dark:text-zinc-50">
          {money(total)}
        </p>
      </div>
      <svg
        viewBox="0 0 720 190"
        className="h-48 w-full overflow-visible sm:h-56"
        role="img"
        aria-label={`Daily revenue for the last ${DAILY_REVENUE_DAYS} days, totalling ${money(total)}`}
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
    </Card>
  );
}

const QUICK_ACTIONS = [
  { href: ROUTES.pos.root, label: "Open till", icon: Monitor },
  { href: ROUTES.productsNew, label: "Add product", icon: PackagePlus },
  { href: ROUTES.purchases.new, label: "New purchase order", icon: ShoppingCart },
  { href: ROUTES.customers.root, label: "Customers", icon: Users },
  { href: ROUTES.pos.close, label: "End of day", icon: Moon },
];

function SyncPanel({
  pendingCount,
  conflictCount,
}: Readonly<{ pendingCount: number; conflictCount: number }>) {
  const isConflict = conflictCount > 0;
  const isPending = !isConflict && pendingCount > 0;
  const isOk = !isConflict && !isPending;

  let containerClass =
    "border-[#004b1e] bg-[#004b1e]/8 dark:border-green-800/40 dark:bg-green-950/10";
  let iconClass = "bg-[#004b1e] text-[#4ade80] dark:bg-green-900/40";
  let title = "All data synced";
  let body = "Your local data is up to date with the server.";

  if (isConflict) {
    containerClass =
      "border-error/30 bg-error-container/10 dark:border-red-800/40 dark:bg-red-950/20";
    iconClass = "bg-error text-on-error";
    title = `${conflictCount} sync conflict${conflictCount > 1 ? "s" : ""} need attention`;
    body = "Review conflicts to prevent data loss.";
  } else if (isPending) {
    containerClass =
      "border-outline-variant bg-surface-container-lowest dark:border-zinc-800 dark:bg-zinc-900";
    iconClass = "bg-primary/10 text-primary dark:bg-blue-900/30 dark:text-blue-400";
    title = `${pendingCount} record${pendingCount > 1 ? "s" : ""} pending sync`;
    body = "These upload automatically when the connection returns.";
  }

  return (
    <div
      className={`flex items-start gap-4 rounded-2xl border p-5 transition-colors ${containerClass}`}
    >
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        {isConflict && <AlertTriangle size={18} />}
        {isOk && <CheckCircle2 size={18} />}
        {isPending && <RefreshCw size={18} />}
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-on-surface dark:text-zinc-100">
          {title}
        </p>
        <p className="mt-0.5 text-xs text-on-surface-variant dark:text-zinc-400">
          {body}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { money } = useSettings();
  const { pendingCount, conflictCount } = useSyncStatus();

  const [summary, setSummary] = useState<TodaysOrderSummary | null>(null);
  const [alerts, setAlerts] = useState<InventoryAlerts | null>(null);
  const [recentSales, setRecentSales] = useState<PendingOrder[]>([]);
  const [activity, setActivity] = useState<StockMovement[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenuePoint[]>(() =>
    getDefaultDailyRevenue(),
  );

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  useEffect(() => {
    getTodaysOrderSummary().then(setSummary);
    getInventoryAlerts().then(setAlerts);
    listStockMovements({ limit: 8 }).then(setActivity);
    db.pendingOrders
      .orderBy("created_at")
      .reverse()
      .toArray()
      .then((orders) => {
        setDailyRevenue(buildDailyRevenue(orders));
        setRecentSales(orders.slice(0, 6));
      });
  }, []);

  const lowStockCount = alerts
    ? alerts.lowStock.length + alerts.outOfStock.length
    : null;
  const expiryCount = alerts
    ? alerts.nearExpiry.length + alerts.expired.length
    : null;

  return (
    <div className="flex flex-col gap-8 pb-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-on-surface dark:text-zinc-50">
          {greeting}
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant dark:text-zinc-400">
          Here is how the store is doing today.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Quick actions" />
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant px-4 text-sm font-medium text-on-surface transition-colors hover:border-primary/40 hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                <Icon size={16} className="opacity-60" aria-hidden />
                {action.label}
              </Link>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Today's overview" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Revenue today"
            value={summary ? money(summary.totalCents) : "—"}
            icon={<DollarSign size={20} />}
            accent="primary"
            sub="All completed orders"
          />
          <StatCard
            label="Orders today"
            value={summary ? String(summary.orderCount) : "—"}
            icon={<ShoppingBag size={20} />}
            accent="secondary"
            sub="Processed at the till"
          />
          <StatCard
            label="Stock alerts"
            value={lowStockCount === null ? "—" : String(lowStockCount)}
            icon={<Package size={20} />}
            accent={lowStockCount ? "warning" : "secondary"}
            sub="Low or out of stock"
            href={ROUTES.inventory.alerts}
          />
          <StatCard
            label="Expiry alerts"
            value={expiryCount === null ? "—" : String(expiryCount)}
            icon={<AlertTriangle size={20} />}
            accent={expiryCount ? "warning" : "secondary"}
            sub="Near or past expiry"
            href={ROUTES.inventory.alerts}
          />
        </div>
        <DailyRevenueChart points={dailyRevenue} money={money} />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Recent sales"
            action={
              <Link
                href={ROUTES.sales.root}
                className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline dark:text-blue-400"
              >
                View all
                <ChevronRight size={13} aria-hidden />
              </Link>
            }
          />
          <Card>
            {recentSales.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag size={20} />}
                title="No sales yet"
                description="Sales recorded at the till appear here."
                action={
                  <Link
                    href={ROUTES.pos.root}
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-secondary px-5 text-sm font-medium text-on-secondary dark:bg-white dark:text-zinc-900"
                  >
                    Open till
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-col gap-1">
                {recentSales.map((order) => (
                  <li key={order.client_generated_id}>
                    <Link
                      href={ROUTES.sales.detail(order.client_generated_id)}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-surface-container dark:hover:bg-zinc-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-on-surface dark:text-zinc-100">
                          {order.receipt_no ??
                            order.client_generated_id.slice(0, 8)}
                        </span>
                        <span className="block text-xs text-on-surface-variant dark:text-zinc-400">
                          {order.items.length} items ·{" "}
                          {formatDateTime(order.created_at)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-on-surface dark:text-zinc-50">
                        {money(order.total_cents)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <SectionHeader
            title="Recent activity"
            action={
              <Link
                href={ROUTES.inventory.movements}
                className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline dark:text-blue-400"
              >
                Full history
                <ChevronRight size={13} aria-hidden />
              </Link>
            }
          />
          <Card>
            {activity.length === 0 ? (
              <EmptyState
                icon={<Package size={20} />}
                title="Nothing has moved yet"
                description="Stock changes from sales, deliveries, and adjustments show up here."
              />
            ) : (
              <ol className="flex flex-col gap-0">
                {activity.map((movement, index) => (
                  <li key={movement.id} className="flex gap-3">
                    {/* Timeline rail: a dot per event, joined by a line that
                        stops before the final entry. */}
                    <div className="flex flex-col items-center">
                      <span
                        aria-hidden
                        className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                          movement.quantity_delta >= 0
                            ? "bg-on-tertiary-container"
                            : "bg-amber-500"
                        }`}
                      />
                      {index < activity.length - 1 && (
                        <span
                          aria-hidden
                          className="w-px flex-1 bg-outline-variant dark:bg-zinc-800"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-4">
                      <p className="truncate text-sm font-medium text-on-surface dark:text-zinc-100">
                        {movement.product_name}
                      </p>
                      <p className="text-xs capitalize text-on-surface-variant dark:text-zinc-400">
                        {movement.type.replace("_", " ")} ·{" "}
                        {movement.quantity_delta > 0 ? "+" : ""}
                        {movement.quantity_delta} ·{" "}
                        {formatDateTime(movement.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title="Cloud sync" />
        <SyncPanel pendingCount={pendingCount} conflictCount={conflictCount} />
      </section>

      <PluginDashboardWidget />
    </div>
  );
}
