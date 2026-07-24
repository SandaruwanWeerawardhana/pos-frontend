"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Table, type TableColumn } from "@/components/ui/Table";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface DaySummary {
  date: string;
  totalCents: number;
  orderCount: number;
}

interface ProductSummary {
  name: string;
  quantity: number;
  revenueCents: number;
}

export default function ReportsPage() {
  const [days, setDays] = useState<DaySummary[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSummary[]>([]);

  useEffect(() => {
    db.pendingOrders.toArray().then((orders) => {
      const byDay = new Map<string, DaySummary>();
      const byProduct = new Map<string, ProductSummary>();

      for (const order of orders) {
        const dateKey = new Date(order.created_at).toLocaleDateString();
        const day = byDay.get(dateKey) ?? {
          date: dateKey,
          totalCents: 0,
          orderCount: 0,
        };
        day.totalCents += order.total_cents;
        day.orderCount += 1;
        byDay.set(dateKey, day);

        for (const item of order.items) {
          const product = byProduct.get(item.product_id) ?? {
            name: item.name,
            quantity: 0,
            revenueCents: 0,
          };
          product.quantity += item.quantity;
          product.revenueCents += item.unit_price_cents * item.quantity;
          byProduct.set(item.product_id, product);
        }
      }

      setDays(
        Array.from(byDay.values()).sort((a, b) => b.date.localeCompare(a.date)),
      );
      setTopProducts(
        Array.from(byProduct.values())
          .sort((a, b) => b.revenueCents - a.revenueCents)
          .slice(0, 10),
      );
    });
  }, []);

  const dayColumns: TableColumn<DaySummary>[] = [
    { key: "date", header: "Date", render: (day) => day.date },
    {
      key: "orders",
      header: "Orders",
      render: (day) => String(day.orderCount),
    },
    {
      key: "total",
      header: "Total",
      render: (day) => formatCents(day.totalCents),
    },
  ];

  const productColumns: TableColumn<ProductSummary>[] = [
    { key: "name", header: "Product", render: (product) => product.name },
    {
      key: "quantity",
      header: "Qty sold",
      render: (product) => product.quantity.toString(),
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (product) => formatCents(product.revenueCents),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
        Reports
      </h1>
      <div>
        <h2 className="mb-2 text-sm font-medium text-on-surface-variant dark:text-zinc-300">
          Sales by day
        </h2>
        <Table
          columns={dayColumns}
          rows={days}
          rowKey={(day) => day.date}
          emptyMessage="No sales yet."
        />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-medium text-on-surface-variant dark:text-zinc-300">
          Top products
        </h2>
        <Table
          columns={productColumns}
          rows={topProducts}
          rowKey={(product) => product.name}
          emptyMessage="No sales yet."
        />
      </div>
    </div>
  );
}
