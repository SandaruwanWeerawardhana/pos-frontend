"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { liveQuery } from "dexie";
import { Download } from "lucide-react";
import { db } from "@/lib/db";
import type { PendingOrder, SyncStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useSettings } from "@/lib/hooks/use-settings";
import { exportCsv, type ExportColumn } from "@/lib/export";
import { formatDateTime } from "@/lib/format";
import { ROUTES } from "@/lib/types/routes";

const STATUS_VARIANT: Record<
  SyncStatus,
  "neutral" | "success" | "warning" | "danger"
> = {
  pending: "neutral",
  syncing: "neutral",
  synced: "success",
  conflict: "warning",
  error: "danger",
};

export default function SalesPage() {
  const { money } = useSettings();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [method, setMethod] = useState("");

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.pendingOrders.orderBy("created_at").reverse().toArray(),
    ).subscribe({ next: setOrders });
    return () => subscription.unsubscribe();
  }, []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status && order.sync_status !== status) return false;
      if (method && order.payment_method !== method) return false;
      if (!needle) return true;
      return (
        (order.receipt_no ?? "").toLowerCase().includes(needle) ||
        order.client_generated_id.toLowerCase().includes(needle) ||
        order.items.some((item) => item.name.toLowerCase().includes(needle))
      );
    });
  }, [orders, query, status, method]);

  const totals = useMemo(() => {
    const settled = visible.filter((order) => !order.refunded);
    return {
      count: settled.length,
      revenueCents: settled.reduce((sum, order) => sum + order.total_cents, 0),
      refunded: visible.filter((order) => order.refunded).length,
    };
  }, [visible]);

  const exportColumns: ExportColumn<PendingOrder>[] = [
    { key: "receipt", header: "Receipt", value: (o) => o.receipt_no ?? o.client_generated_id },
    { key: "date", header: "Date", value: (o) => new Date(o.created_at).toISOString() },
    { key: "items", header: "Items", value: (o) => o.items.length },
    { key: "tax", header: "Tax", value: (o) => (o.tax_total_cents / 100).toFixed(2) },
    { key: "discount", header: "Discount", value: (o) => ((o.discount_cents ?? 0) / 100).toFixed(2) },
    { key: "total", header: "Total", value: (o) => (o.total_cents / 100).toFixed(2) },
    { key: "payment", header: "Payment", value: (o) => o.payment_method },
    { key: "sync", header: "Sync status", value: (o) => o.sync_status },
    { key: "refunded", header: "Refunded", value: (o) => (o.refunded ? "yes" : "no") },
  ];

  const columns: DataColumn<PendingOrder>[] = [
    {
      key: "date",
      header: "When",
      sortValue: (order) => order.created_at,
      render: (order) => (
        <Link
          href={ROUTES.sales.detail(order.client_generated_id)}
          className="font-medium hover:underline"
        >
          {formatDateTime(order.created_at)}
          <span className="block text-xs font-normal text-on-surface-variant dark:text-zinc-400">
            {order.receipt_no ?? order.client_generated_id.slice(0, 8)}
          </span>
        </Link>
      ),
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      hideOnMobile: true,
      sortValue: (order) => order.items.length,
      render: (order) => String(order.items.length),
    },
    {
      key: "payment",
      header: "Payment",
      hideOnMobile: true,
      sortValue: (order) => order.payment_method,
      render: (order) =>
        order.payments && order.payments.length > 1 ? (
          <Badge variant="neutral">split × {order.payments.length}</Badge>
        ) : (
          <span className="capitalize">{order.payment_method}</span>
        ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortValue: (order) => order.total_cents,
      render: (order) => money(order.total_cents),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (order) => order.sync_status,
      render: (order) => (
        <Badge variant={order.refunded ? "danger" : STATUS_VARIANT[order.sync_status]}>
          {order.refunded ? "refunded" : order.sync_status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="Operate"
        title="Sales"
        description="Every sale recorded on this device, with its cloud sync state."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Sales" },
        ]}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportCsv("sales", visible, exportColumns)}
          >
            <Download size={15} />
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          label="Revenue shown"
          value={money(totals.revenueCents)}
          accent="primary"
          sub="Excludes refunded sales"
        />
        <StatCard
          label="Sales shown"
          value={String(totals.count)}
          accent="secondary"
          sub={`${orders.length} total on device`}
        />
        <StatCard
          label="Refunded"
          value={String(totals.refunded)}
          accent={totals.refunded > 0 ? "warning" : "secondary"}
          sub="Marked refunded locally"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search receipt or product…"
          aria-label="Search sales"
        />
        <Select
          value={method}
          onChange={(event) => setMethod(event.target.value)}
          placeholder="All payment methods"
          aria-label="Filter by payment method"
          options={[
            { value: "cash", label: "Cash" },
            { value: "card", label: "Card" },
            { value: "qr", label: "QR / Wallet" },
            { value: "other", label: "Other" },
          ]}
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          placeholder="All sync statuses"
          aria-label="Filter by sync status"
          options={[
            { value: "pending", label: "Pending" },
            { value: "syncing", label: "Syncing" },
            { value: "synced", label: "Synced" },
            { value: "conflict", label: "Conflict" },
            { value: "error", label: "Error" },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        rows={visible}
        rowKey={(order) => order.client_generated_id}
        emptyMessage="No sales match these filters."
        caption="Sales history"
      />
    </div>
  );
}
