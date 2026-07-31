"use client";

import { Input } from "@/components/ui/Input";
import { parseMoneyToCents } from "@/lib/format";
import { useSettings } from "@/lib/hooks/use-settings";
import { summarisePricing } from "@/lib/products/schema";
import { Tags } from "lucide-react";
import { useWatch } from "react-hook-form";
import { FormSection, RequiredMark } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface PricingSectionProps extends ProductSectionProps {
  errorCount: number;
}

function Metric({
  label,
  value,
  tone = "neutral",
  hint,
}: Readonly<{
  label: string;
  value: string;
  tone?: "neutral" | "good" | "bad";
  hint?: string;
}>) {
  const toneClass = {
    neutral: "text-on-surface dark:text-zinc-50",
    good: "text-on-tertiary-container dark:text-green-400",
    bad: "text-error dark:text-red-400",
  }[tone];

  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low/70 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
      <p className="text-xs font-medium text-on-surface-variant dark:text-zinc-400">
        {label}
      </p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 text-[11px] text-on-surface-variant dark:text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PricingSection({
  form,
  errorCount,
}: Readonly<PricingSectionProps>) {
  const { control, register, formState } = form;
  const errors = formState.errors;
  const { money } = useSettings();

  const [sellingPrice, costPrice, taxRate, discountPercent] = useWatch({
    control,
    name: ["selling_price", "cost_price", "tax_rate", "discount_percent"],
  });

  const summary = summarisePricing({
    selling_price: sellingPrice,
    tax_rate: taxRate,
    discount_percent: discountPercent,
  });

  // Margin is measured against the net price — what the till actually charges
  // after the standing discount — not the list price, so a product discounted
  // below cost reads as the loss it is.
  const costCents = parseMoneyToCents(costPrice);
  const marginCents =
    costCents === null || summary.netPriceCents === null
      ? null
      : summary.netPriceCents - costCents;
  const marginPercent =
    marginCents === null || !summary.netPriceCents
      ? null
      : (marginCents / summary.netPriceCents) * 100;

  return (
    <FormSection
      id="pricing"
      title="Pricing"
      icon={<Tags size={18} />}
      errorCount={errorCount}
      plain
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={
            <>
              Price
              <RequiredMark />
            </>
          }
          placeholder="0.00"
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          error={errors.selling_price?.message}
          {...register("selling_price")}
        />

        <Input
          label="Cost price"
          placeholder="0.00"
          hint="What the shop pays. Drives the margin and profit reports."
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          error={errors.cost_price?.message}
          {...register("cost_price")}
        />

        <Input
          label="Tax"
          placeholder="0"
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          error={errors.tax_rate?.message}
          {...register("tax_rate")}
        />

        <Input
          label="Discount percentage"
          placeholder="0"
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          error={errors.discount_percent?.message}
          {...register("discount_percent")}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric
          label="Charged at the till"
          value={
            summary.grossPriceCents === null
              ? "—"
              : money(summary.grossPriceCents)
          }
          hint="After discount, including tax"
        />
        <Metric
          label="Tax"
          value={summary.taxCents === null ? "—" : money(summary.taxCents)}
        />
        <Metric
          label="Margin"
          value={marginCents === null ? "—" : money(marginCents)}
          tone={marginCents !== null && marginCents < 0 ? "bad" : "good"}
          hint={
            marginPercent === null ? undefined : `${marginPercent.toFixed(1)}%`
          }
        />
      </div>
    </FormSection>
  );
}
