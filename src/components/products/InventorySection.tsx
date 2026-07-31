"use client";

import { NumberField } from "@/components/ui/NumberField";
import { WEIGHT_UNITS } from "@/lib/products/constants";
import { Boxes } from "lucide-react";
import { Controller, useWatch } from "react-hook-form";
import { FormSection } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface InventorySectionProps extends ProductSectionProps {
  errorCount: number;
}

/**
 * Opening stock and the minimum level. Weighed goods arrive as 12.5 kg, not 12
 * units, so the stepper works in fractions for them and whole numbers for
 * everything else.
 */
export function InventorySection({
  form,
  errorCount,
}: Readonly<InventorySectionProps>) {
  const { control, formState } = form;
  const errors = formState.errors;

  const [unit, minStock] = useWatch({
    control,
    name: ["unit", "min_stock_level"],
  });

  const weighed = WEIGHT_UNITS.includes(unit);
  const stockStep = weighed ? 0.5 : 1;
  const stockPrecision = weighed ? 3 : 0;

  return (
    <FormSection
      id="inventory"
      title="Inventory"
      icon={<Boxes size={18} />}
      errorCount={errorCount}
      plain
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="initial_stock"
          render={({ field }) => (
            <NumberField
              label="Initial stock"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              step={stockStep}
              precision={stockPrecision}
              suffix={unit === "unit" ? undefined : unit}
              error={errors.initial_stock?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="min_stock_level"
          render={({ field }) => (
            <NumberField
              label="Minimum stock level"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="0"
              error={errors.min_stock_level?.message}
            />
          )}
        />
      </div>

      {minStock !== "" && (
        <p className="sr-only" aria-live="polite">
          Minimum stock {minStock}
        </p>
      )}
    </FormSection>
  );
}
