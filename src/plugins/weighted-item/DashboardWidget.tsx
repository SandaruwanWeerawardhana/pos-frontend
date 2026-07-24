"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";

// Heuristic: a non-integer cart-item quantity means it was weighed rather
// than counted, since regular items are always sold in whole units.
export function DashboardWidget() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const since = new Date();
    since.setHours(0, 0, 0, 0);

    db.pendingOrders
      .where("created_at")
      .aboveOrEqual(since.getTime())
      .toArray()
      .then((orders) => {
        const weighted = orders
          .flatMap((order) => order.items)
          .filter((item) => !Number.isInteger(item.quantity));
        setCount(weighted.length);
      });
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Weighted items sold today
      </p>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {count ?? "…"}
      </p>
    </div>
  );
}
