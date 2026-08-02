"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { db } from "@/lib/db";
import type { PendingOrder, ServerOrder } from "@/lib/types";
import { Receipt } from "@/components/pos/Receipt";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

type SaleDetailPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;


function serverOrderToPending(order: ServerOrder): PendingOrder {
  return {
    client_generated_id: order.client_generated_id,
    items: order.items.map((item) => ({
      product_id: item.product_id ?? "",
      name: item.name,
      quantity: item.quantity,
      unit_price_cents: item.unit_price_cents,
      tax_rate: item.tax_rate,
      ...(item.unit ? { unit: item.unit } : {}),
      ...(item.is_weighted ? { is_weighted: item.is_weighted } : {}),
      ...(item.line_discount_cents
        ? { line_discount_cents: item.line_discount_cents }
        : {}),
    })),
    total_cents: order.total_cents,
    tax_total_cents: order.tax_total_cents,
    payment_method: order.payment_method,
    created_at: order.sold_at,
    sync_status: "synced",
    server_id: order.id,
    discount_cents: order.discount_cents,
    refunded: order.refunded,
    payments: order.payments,
    ...(order.cashier_id ? { cashier_id: order.cashier_id } : {}),
    ...(order.receipt_no ? { receipt_no: order.receipt_no } : {}),
  };
}

export default function SaleDetailPage({ params }: SaleDetailPageProps) {
  const { id } = use(params);
  const [order, setOrder] = useState<PendingOrder | null | undefined>(undefined);
  // Whether this device holds its own copy. Only then can it be annotated —
  // the refund flag is local, with no endpoint behind it.
  const [hasLocalCopy, setHasLocalCopy] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

 
    async function load() {
      const local = await db.pendingOrders.get(id);
      if (cancelled) return;
      if (local) {
        setOrder(local);
        setHasLocalCopy(true);
        return;
      }

      try {
        const remote = await apiClient.getOrders({ search: id, per_page: 1 });
        if (cancelled) return;
        const match = remote.orders.find(
          (candidate) => candidate.client_generated_id === id,
        );
        setOrder(match ? serverOrderToPending(match) : null);
      } catch {
    
        if (!cancelled) setOrder(null);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleRefund() {
    if (!order) return;
    await db.pendingOrders.update(order.client_generated_id, { refunded: true });
    setOrder({ ...order, refunded: true });
    showToast("Marked as refunded (local only)", "success");
  }

  if (order === undefined) {
    return <p className="text-sm text-on-surface-variant dark:text-zinc-400">Loading…</p>;
  }

  if (order === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-on-surface-variant dark:text-zinc-400">
          Order not found.
        </p>
        <Link href={ROUTES.sales.root} className="text-sm hover:underline">
          Back to sales
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
          Sale detail
        </h1>
        <Link
          href={ROUTES.sales.root}
          className="text-sm text-on-surface-variant hover:underline dark:text-zinc-400"
        >
          Back to sales
        </Link>
      </div>
      <Receipt order={order} />
      {!order.refunded && hasLocalCopy && (
        <div className="mx-auto w-full max-w-sm">
          <Button
            type="button"
            variant="danger"
            className="w-full"
            onClick={handleRefund}
          >
            Mark as refunded
          </Button>
          <p className="mt-2 text-center text-xs text-on-surface-variant">
            Local-only annotation — there is no backend refund endpoint yet,
            so this does not sync.
          </p>
        </div>
      )}
      {!hasLocalCopy && (
        <p className="mx-auto max-w-sm text-center text-xs text-on-surface-variant">
          Loaded from the server. This sale was not rung up on this device, so it
          cannot be annotated here.
        </p>
      )}
    </div>
  );
}
