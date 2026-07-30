"use client";

import { Controller, useWatch } from "react-hook-form";
import { Tags, TrendingDown, TrendingUp } from "lucide-react";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { FormSection, RequiredMark } from "./FormSection";
import { summarisePricing } from "@/lib/products/schema";
import { useSettings } from "@/lib/hooks/use-settings";
import { formatPercent } from "@/lib/format";
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
  const { settings, money } = useSettings();

  const [costPrice, sellingPrice, taxRate, discountPercent] = useWatch({
    control,
    name: ["cost_price", "selling_price", "tax_rate", "discount_percent"],
  });

  // Recomputed on every keystroke in these four fields — the numbers are what
  // tell a buyer whether the price they just typed is the one they meant.
  const summary = summarisePricing({
    cost_price: costPrice,
    selling_price: sellingPrice,
    tax_rate: taxRate,
    discount_percent: discountPercent,
  });

  const taxOptions = settings.tax_rates.map((rate) => ({
    value: String(rate.rate * 100),
    label: `${rate.name} — ${formatPercent(rate.rate * 100)}`,
    hint: rate.is_default ? "Store default" : undefined,
  }));

  let marginTone: "neutral" | "good" | "bad" = "neutral";
  if (summary.marginPercent !== null) {
    marginTone = summary.marginPercent >= 0 ? "good" : "bad";
  }

  return (
    <FormSection
      id="pricing"
      title="Pricing"
      description="Cost, shelf price, tax, and the margin they produce"
      icon={<Tags size={18} />}
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Cost price"
          placeholder="0.00"
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          hint={`What you pay per unit in ${settings.currency_code}, excluding tax.`}
          error={errors.cost_price?.message}
          {...register("cost_price")}
        />

        <Input
          label={
            <>
              Selling price
              <RequiredMark />
            </>
          }
          placeholder="0.00"
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          hint="Shelf price before any standing discount."
          error={errors.selling_price?.message}
          {...register("selling_price")}
        />

        <Controller
          control={control}
          name="tax_rate"
          render={({ field }) => (
            <Combobox
              label="Tax"
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={taxOptions}
              placeholder="Search tax rates"
              allowCustom
              emptyMessage="Type a custom percentage"
              hint="Percentage. Rates come from Settings; type to override."
              error={errors.tax_rate?.message}
            />
          )}
        />

        <Input
          label="Discount percentage"
          placeholder="0"
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          hint="Standing discount applied at the till, 0–100."
          error={errors.discount_percent?.message}
          {...register("discount_percent")}
        />
      </div>

      <div
        aria-live="polite"
        className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Metric
          label="Net price"
          value={
            summary.netPriceCents === null ? "—" : money(summary.netPriceCents)
          }
          hint="After discount, before tax"
        />
        <Metric
          label="Price with tax"
          value={
            summary.grossPriceCents === null
              ? "—"
              : money(summary.grossPriceCents)
          }
          hint={
            summary.taxCents === null
              ? undefined
              : `${money(summary.taxCents)} tax`
          }
        />
        <Metric
          label="Profit margin"
          value={
            summary.marginPercent === null
              ? "—"
              : formatPercent(summary.marginPercent)
          }
          tone={marginTone}
          hint={
            summary.profitCents === null
              ? "Add a cost price"
              : `${money(summary.profitCents)} per unit`
          }
        />
        <Metric
          label="Markup"
          value={
            summary.markupPercent === null
              ? "—"
              : formatPercent(summary.markupPercent)
          }
          tone={marginTone}
          hint="Profit over cost"
        />
      </div>

      {summary.profitCents !== null && summary.profitCents < 0 && (
        <p
          role="alert"
          className="mt-3 flex items-center gap-2 rounded-xl bg-error/10 px-3 py-2 text-xs font-medium text-error"
        >
          <TrendingDown size={14} />
          This product would sell at a loss once the discount is applied.
        </p>
      )}
      {summary.marginPercent !== null && summary.marginPercent >= 40 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-tertiary-container/10 px-3 py-2 text-xs font-medium text-on-tertiary-container dark:text-green-400">
          <TrendingUp size={14} />
          Healthy margin for a grocery line.
        </p>
      )}
    </FormSection>
  );
}
