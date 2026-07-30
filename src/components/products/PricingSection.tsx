"use client";

import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { formatPercent } from "@/lib/format";
import { useSettings } from "@/lib/hooks/use-settings";
import { summarisePricing } from "@/lib/products/schema";
import { Tags } from "lucide-react";
import { Controller, useWatch } from "react-hook-form";
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
  const { settings, money } = useSettings();

  const [sellingPrice, taxRate, discountPercent] = useWatch({
    control,
    name: ["selling_price", "tax_rate", "discount_percent"],
  });

  // Recomputed on every keystroke in these fields — the numbers are what tell
  // a buyer whether the price they just typed is the one they meant.
  const summary = summarisePricing({
    selling_price: sellingPrice,
    tax_rate: taxRate,
    discount_percent: discountPercent,
  });

  const taxOptions = settings.tax_rates.map((rate) => ({
    value: String(rate.rate * 100),
    label: `${rate.name} — ${formatPercent(rate.rate * 100)}`,
    hint: rate.is_default ? "Store default" : undefined,
  }));

  return (
    <FormSection
      id="pricing"
      title="Pricing"
      icon={<Tags size={18} />}
      errorCount={errorCount}
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
          error={errors.discount_percent?.message}
          {...register("discount_percent")}
        />
      </div>
    </FormSection>
  );
}
