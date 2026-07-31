"use client";

import { Input } from "@/components/ui/Input";
import { Apple } from "lucide-react";
import { useWatch } from "react-hook-form";
import { FormSection } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface GrocerySectionProps extends ProductSectionProps {
  errorCount: number;
}

export function GrocerySection({
  form,
  errorCount,
}: Readonly<GrocerySectionProps>) {
  const { control, register, formState } = form;
  const errors = formState.errors;

  // Either date filled in means the opening stock is written as a batch, which
  // is what the expiry and batch reports read from. See toProduct().
  const [expiryDate, manufacturingDate] = useWatch({
    control,
    name: ["expiry_date", "manufacturing_date"],
  });
  const opensBatch = Boolean(expiryDate || manufacturingDate);

  return (
    <FormSection
      id="grocery"
      title="Grocery information"
      description="Handling, weighing, batches, and shelf life"
      icon={<Apple size={18} />}
      errorCount={errorCount}
      plain
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Manufacturing date"
          type="date"
          className="min-h-12"
          error={errors.manufacturing_date?.message}
          {...register("manufacturing_date")}
        />
        <Input
          label="Expiry date"
          type="date"
          className="min-h-12"
          error={errors.expiry_date?.message}
          {...register("expiry_date")}
        />
      </div>

      {opensBatch && (
        <p className="mt-3 rounded-xl bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant dark:bg-zinc-800/60 dark:text-zinc-400">
          The opening stock will be recorded as the first batch, so expiry and
          batch reports have something to report on from day one.
        </p>
      )}
    </FormSection>
  );
}
