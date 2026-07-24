"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import type { PendingOrder } from "@/lib/types";
import { Receipt } from "@/components/pos/Receipt";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

type SaleDetailPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default function SaleDetailPage({
  params,
}: SaleDetailPageProps) {
  const { id } = use(params);
  const [order, setOrder] = useState<PendingOrder | null | undefined>(undefined);
  const { showToast } = useToast();

  useEffect(() => {
    db.pendingOrders.get(id).then((found) => setOrder(found ?? null));
  }, [id]);

  async function handleRefund() {
    if (!order) return;
    await db.pendingOrders.update(order.client_generated_id, {
      refunded: true,
    });
    setOrder({ ...order, refunded: true });
    showToast("Marked as refunded (local only)", "success");
  }

  if (order === undefined) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>;
  }

  if (order === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Sale detail
        </h1>
        <Link
          href={ROUTES.sales.root}
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back to sales
        </Link>
      </div>
      <Receipt order={order} />
      {!order.refunded && (
        <div className="mx-auto w-full max-w-sm">
          <Button
            type="button"
            variant="danger"
            className="w-full"
            onClick={handleRefund}
          >
            Mark as refunded
          </Button>
          <p className="mt-2 text-center text-xs text-zinc-400">
            Local-only annotation — there is no backend refund endpoint yet,
            so this does not sync.
          </p>
        </div>
      )}
    </div>
  );
}
