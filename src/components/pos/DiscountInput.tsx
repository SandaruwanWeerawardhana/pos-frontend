"use client";

import { useEffect, useState } from "react";
import { getActiveDiscounts } from "@/lib/db";
import type { Discount } from "@/lib/types";

interface DiscountInputProps {
  selectedId: string | null;
  onSelect: (discount: Discount | null) => void;
}

export function DiscountInput({ selectedId, onSelect }: DiscountInputProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  useEffect(() => {
    getActiveDiscounts().then(setDiscounts);
  }, []);

  if (discounts.length === 0) return null;

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">
        Discount
      </span>
      <select
        value={selectedId ?? ""}
        onChange={(event) => {
          const discount =
            discounts.find((d) => d.id === event.target.value) ?? null;
          onSelect(discount);
        }}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      >
        <option value="">No discount</option>
        {discounts.map((discount) => (
          <option key={discount.id} value={discount.id}>
            {discount.name} (
            {discount.type === "percentage"
              ? `${discount.value}%`
              : `$${(discount.value / 100).toFixed(2)}`}
            )
          </option>
        ))}
      </select>
    </label>
  );
}
