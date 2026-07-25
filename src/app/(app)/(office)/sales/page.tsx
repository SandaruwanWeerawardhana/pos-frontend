"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { liveQuery } from "dexie";
import { db } from "@/lib/db";
import type { PendingOrder, SyncStatus } from "@/lib/types";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/lib/types/routes";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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
  const [orders, setOrders] = useState<PendingOrder[]>([]);

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.pendingOrders.orderBy("created_at").reverse().toArray(),
    ).subscribe({ next: setOrders });
    return () => subscription.unsubscribe();
  }, []);

  const columns: TableColumn<PendingOrder>[] = [
    {
      key: "date",
      header: "Date",
      render: (order) => (
        <Link
          href={ROUTES.sales.detail(order.client_generated_id)}
          className="hover:underline"
        >
          {new Date(order.created_at).toLocaleString()}
        </Link>
      ),
    },
    {
      key: "items",
      header: "Items",
      render: (order) => `${order.items.length}`,
    },
    {
      key: "total",
      header: "Total",
      render: (order) => formatCents(order.total_cents),
    },
    {
      key: "payment",
      header: "Payment",
      render: (order) => order.payment_method,
    },
    {
      key: "status",
      header: "Status",
      render: (order) => (
        <Badge variant={STATUS_VARIANT[order.sync_status]}>
          {order.sync_status}
          {order.refunded ? " · refunded" : ""}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
        Sales
      </h1>
      <Table
        columns={columns}
        rows={orders}
        rowKey={(order) => order.client_generated_id}
        emptyMessage="No sales yet."
      />
    </div>
  );
}
