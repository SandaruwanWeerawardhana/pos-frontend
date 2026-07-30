"use client";

import { useEffect, useState } from "react";
import { getEligibleDiscounts } from "@/lib/db";
import { Select } from "@/components/ui/Select";
import { useSettings } from "@/lib/hooks/use-settings";
import type { Discount } from "@/lib/types";

interface DiscountInputProps {
  selectedId: string | null;
  /** Pre-discount subtotal, used to filter out campaigns below their threshold. */
  subtotalCents: number;
  onSelect: (discount: Discount | null) => void;
}

export function DiscountInput({
  selectedId,
  subtotalCents,
  onSelect,
}: Readonly<DiscountInputProps>) {
  const { money } = useSettings();
  const [discounts, setDiscounts] = useState<Discount[]>([]);

  // Re-read whenever the subtotal crosses a threshold so a campaign appears
  // the moment the basket qualifies for it.
  useEffect(() => {
    getEligibleDiscounts(subtotalCents).then(setDiscounts);
  }, [subtotalCents]);

  useEffect(() => {
    // A campaign can stop qualifying when items are removed; drop the
    // selection rather than silently applying an expired promotion.
    if (selectedId && !discounts.some((discount) => discount.id === selectedId)) {
      onSelect(null);
    }
  }, [discounts, selectedId, onSelect]);

  if (discounts.length === 0) return null;

  function describe(discount: Discount): string {
    switch (discount.type) {
      case "percentage":
        return `${discount.name} (${discount.value}%)`;
      case "bogo":
        return `${discount.name} (buy ${discount.buy_quantity ?? 1}, get ${
          discount.get_quantity ?? 1
        } free)`;
      default:
        return `${discount.name} (${money(discount.value)})`;
    }
  }

  return (
    <Select
      label="Discount / promotion"
      value={selectedId ?? ""}
      placeholder="No discount"
      onChange={(event) =>
        onSelect(
          discounts.find((discount) => discount.id === event.target.value) ?? null,
        )
      }
      options={discounts.map((discount) => ({
        value: discount.id,
        label: describe(discount),
      }))}
    />
  );
}
