"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Calculator,
  Calendar,
  Receipt,
  Settings as SettingsIcon,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import {
  getReports3D,
  presetToRange,
  type Grid3D,
  type PaymentMethodSlice,
  type RangePreset,
  type Report3DResult,
} from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/Switch";
import { IsoGridBarChart } from "@/components/reports/threeD/IsoGridBarChart";
import { IsoScatterChart } from "@/components/reports/threeD/IsoScatterChart";
import { useSettings } from "@/lib/hooks/use-settings";
import { useConnectionStore } from "@/lib/store/connection";
import type { PaymentMethod } from "@/lib/types";

/**
 * The dataviz skill's validated 8-hue categorical ramp (dark surface steps —
 * every canvas chart here renders on a near-black plot). Slot order is the
 * CVD-safety mechanism, so rows/series always draw from it in this fixed
 * order rather than being assigned an arbitrary colour.
 */
const CATEGORICAL_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  qr: "QR",
  other: "Other",
};
const PAYMENT_COLORS: Record<PaymentMethod, string> = {
  cash: "#2a78d6",
  card: "#eb6834",
  qr: "#1baf7a",
  other: "#eda100",
};

const RANGES: { value: RangePreset; label: string }[] = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
  { value: "all", label: "All time" },
];

const EMPTY_GRID: Grid3D = { columns: [], rows: [], values: [] };
const EMPTY_RESULT: Report3DResult = {
  stats: { revenueCents: 0, orders: 0, avgOrderCents: 0, cashiers: 0 },
  salesByMonthWarehouse: EMPTY_GRID,
  topProductsByMonth: EMPTY_GRID,
  productMetrics: [],
  paymentMethods: [],
  heatmap: EMPTY_GRID,
  warehouses: [],
};

function ChartCard({
  title,
  subtitle,
  badge,
  badgeTone,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  badge: string;
  badgeTone: "violet" | "sky" | "emerald" | "orange";
  children: ReactNode;
}>) {
  const toneClasses: Record<typeof badgeTone, string> = {
    violet: "bg-violet-600 text-white dark:bg-violet-500",
    sky: "bg-sky-600 text-white dark:bg-sky-500",
    emerald: "bg-emerald-600 text-white dark:bg-emerald-500",
    orange: "bg-orange-600 text-white dark:bg-orange-500",
  };
  return (
    <div className="animate-fade-in-up rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-on-surface dark:text-zinc-50">{title}</h3>
          <p className="text-xs text-on-surface-variant dark:text-zinc-500">{subtitle}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClasses[badgeTone]}`}
        >
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
  tint,
}: Readonly<{ label: string; value: string; icon: ReactNode; tint: string }>) {
  return (
    <div className="flex animate-fade-in-up items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs uppercase tracking-wide text-on-surface-variant dark:text-zinc-500">
          {label}
        </span>
        <span className="block text-lg font-bold text-on-surface dark:text-zinc-50">{value}</span>
      </span>
    </div>
  );
}

function PaymentMethodsCard({
  slices,
  money,
}: Readonly<{ slices: PaymentMethodSlice[]; money: (cents: number) => string }>) {
  const data = slices.map((slice) => ({
    name: `${PAYMENT_LABELS[slice.method]} (${slice.percent}%)`,
    value: slice.amountCents,
    fill: PAYMENT_COLORS[slice.method],
  }));

  return (
    <ChartCard
      title="Payment Methods"
      subtitle="Distribution by method"
      badge="Pie"
      badgeTone="orange"
    >
      {data.length === 0 ? (
        <div className="flex h-72 items-center justify-center text-sm text-on-surface-variant dark:text-zinc-500">
          No payments in this period.
        </div>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="85%"
                paddingAngle={2}
                stroke="none"
                animationDuration={700}
                animationEasing="ease-out"
              />
              <Tooltip formatter={(value) => money(Number(value))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export default function Reports3DPage() {
  const { money, settings } = useSettings();
  const online = useConnectionStore((state) => state.online);

  const [preset, setPreset] = useState<RangePreset>("30d");
  const [warehouseId, setWarehouseId] = useState<string>("all");
  const [data, setData] = useState<Report3DResult>(EMPTY_RESULT);
  const [autoRotate, setAutoRotate] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const range = useMemo(() => presetToRange(preset), [preset]);

  useEffect(() => {
    let cancelled = false;
    getReports3D(range, warehouseId).then((result) => {
      if (!cancelled) setData(result);
    });
    return () => {
      cancelled = true;
    };
  }, [range, warehouseId]);

  const rangeLabel = `${new Date(range.from).toLocaleDateString(settings.locale, { year: "numeric", month: "2-digit", day: "2-digit" })} - ${new Date(range.to).toLocaleDateString(settings.locale, { year: "numeric", month: "2-digit", day: "2-digit" })}`;

  const warehouseColorByRowIndex = CATEGORICAL_DARK;
  const dayColors = CATEGORICAL_DARK.slice(0, 7);

  return (
    <div className="relative flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="Insight"
        title="Reports"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "3D Sales Dashboard" }]}
      />

      <div className="animate-fade-in-up rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-500 to-blue-500 p-6 text-white shadow-elevated">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                online ? "bg-emerald-500/25 text-emerald-100" : "bg-white/15 text-white/80"
              }`}
            >
              <Sparkles size={12} aria-hidden />
              {online ? "Live insights" : "Offline — showing local data"}
            </span>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
              3D Sales Dashboard
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Interactive 3D visualization of sales performance.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <select
                value={warehouseId}
                onChange={(event) => setWarehouseId(event.target.value)}
                className="min-h-11 rounded-lg border border-white/30 bg-white/15 px-3 text-sm font-medium text-white backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&>option]:text-on-surface"
              >
                <option value="all">Filter by warehouse</option>
                {data.warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
              <select
                value={preset}
                onChange={(event) => setPreset(event.target.value as RangePreset)}
                className="min-h-11 rounded-lg border border-white/30 bg-white/15 px-3 text-sm font-medium text-white backdrop-blur-sm transition-colors duration-[var(--duration-fast)] hover:bg-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white [&>option]:text-on-surface"
              >
                {RANGES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <span className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white/90 backdrop-blur-sm">
              <Calendar size={12} aria-hidden />
              {rangeLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Revenue"
          value={money(data.stats.revenueCents)}
          icon={<Wallet size={20} />}
          tint="bg-violet-600 text-white dark:bg-violet-500"
        />
        <StatTile
          label="Orders"
          value={String(data.stats.orders)}
          icon={<Receipt size={20} />}
          tint="bg-sky-600 text-white dark:bg-sky-500"
        />
        <StatTile
          label="Average order"
          value={money(data.stats.avgOrderCents)}
          icon={<Calculator size={20} />}
          tint="bg-emerald-600 text-white dark:bg-emerald-500"
        />
        <StatTile
          label="Cashiers"
          value={String(data.stats.cashiers)}
          icon={<Users size={20} />}
          tint="bg-orange-600 text-white dark:bg-orange-500"
        />
      </div>

      <ChartCard
        title="Sales by Month and Warehouse"
        subtitle="3D bar visualization · drag to rotate"
        badge="3D"
        badgeTone="violet"
      >
        <IsoGridBarChart
          grid={data.salesByMonthWarehouse}
          rowColors={warehouseColorByRowIndex}
          valueFormatter={money}
          axisLabel="Sales"
          height={340}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Top Products by Month"
          subtitle={`Top ${data.topProductsByMonth.rows.length || 7} products`}
          badge="3D"
          badgeTone="sky"
        >
          <IsoGridBarChart
            grid={data.topProductsByMonth}
            rowColors={CATEGORICAL_DARK}
            valueFormatter={money}
            height={300}
          />
        </ChartCard>
        <ChartCard
          title="Product Quantity vs Price vs Revenue"
          subtitle="Auto-rotating scatter"
          badge="3D"
          badgeTone="emerald"
        >
          <IsoScatterChart
            points={data.productMetrics}
            autoRotate={autoRotate}
            formatMoney={money}
            height={300}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PaymentMethodsCard slices={data.paymentMethods} money={money} />
        <ChartCard
          title="Sales Heatmap (Hour x Day of Week)"
          subtitle="Hour x day of week"
          badge="3D"
          badgeTone="emerald"
        >
          <IsoGridBarChart
            grid={data.heatmap}
            rowColors={dayColors}
            valueFormatter={money}
            axisLabel="Sales"
            height={300}
          />
        </ChartCard>
      </div>

      <div className="fixed bottom-6 right-6 z-20">
        {settingsOpen && (
          <div className="mb-3 w-64 animate-fade-in-up rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-elevated dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-on-surface dark:text-zinc-50">
                Chart settings
              </p>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close chart settings"
                className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>
            <Switch
              checked={autoRotate}
              onChange={setAutoRotate}
              label="Auto-rotate scatter"
              description="Spin the quantity/price/revenue chart automatically"
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-label="Chart settings"
          aria-expanded={settingsOpen}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-elevated transition-transform duration-[var(--duration-fast)] hover:scale-105 active:scale-95 dark:bg-violet-500"
        >
          <SettingsIcon size={22} />
        </button>
      </div>
    </div>
  );
}
