"use client";

import { Controller, useWatch } from "react-hook-form";
import { Boxes, MapPin } from "lucide-react";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { NumberField } from "@/components/ui/NumberField";
import { FormSection, RequiredMark } from "./FormSection";
import { WEIGHT_UNITS } from "@/lib/products/constants";
import type { CatalogueOptions } from "@/lib/hooks/use-product-catalogue-options";
import type { ProductSectionProps } from "./types";

interface InventorySectionProps extends ProductSectionProps {
  options: CatalogueOptions;
  errorCount: number;
}

export function InventorySection({
  form,
  options,
  errorCount,
}: Readonly<InventorySectionProps>) {
  const { control, register, formState } = form;
  const errors = formState.errors;

  const [unit, initialStock, minStock, reorderLevel] = useWatch({
    control,
    name: ["unit", "initial_stock", "min_stock_level", "reorder_level"],
  });

  // Weighed goods arrive as 12.5 kg, not 12 units, so the stepper has to work
  // in fractions for them and whole numbers for everything else.
  const weighed = WEIGHT_UNITS.includes(unit);
  const stockStep = weighed ? 0.5 : 1;
  const stockPrecision = weighed ? 3 : 0;

  const stockNumber = Number(initialStock);
  const reorderNumber = Number(reorderLevel);
  const belowReorder =
    Number.isFinite(stockNumber) &&
    Number.isFinite(reorderNumber) &&
    reorderLevel !== "" &&
    stockNumber <= reorderNumber;

  return (
    <FormSection
      id="inventory"
      title="Inventory"
      description="Opening stock, alert thresholds, and where the item lives"
      icon={<Boxes size={18} />}
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              hint="Quantity on hand right now."
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
              hint="Never let the shelf fall below this."
            />
          )}
        />

        <Controller
          control={control}
          name="reorder_level"
          render={({ field }) => (
            <NumberField
              label="Reorder level"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              placeholder="5"
              error={errors.reorder_level?.message}
              hint="Triggers the low-stock alert."
            />
          )}
        />

        <Input
          label={
            <span className="flex items-center gap-1.5">
              <MapPin size={13} aria-hidden />
              Shelf location
            </span>
          }
          placeholder="A3-04"
          autoComplete="off"
          className="font-mono"
          hint="Aisle-bay code used for picking."
          error={errors.shelf_location?.message}
          {...register("shelf_location")}
        />

        <Controller
          control={control}
          name="warehouse_id"
          render={({ field }) => (
            <Combobox
              label="Warehouse"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={options.warehouses.map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
                hint: warehouse.location,
              }))}
              placeholder="Search warehouses"
              emptyMessage="No warehouses yet — add one in Inventory"
              error={errors.warehouse_id?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="branch"
          render={({ field }) => (
            <Combobox
              label="Branch"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={options.branches.map((branch) => ({
                value: branch,
                label: branch,
              }))}
              placeholder="Search or add a branch"
              allowCustom
              emptyMessage="Type to add a new branch"
              error={errors.branch?.message}
            />
          )}
        />
      </div>

      {belowReorder && (
        <p className="mt-4 rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
          Opening stock is at or below the reorder level — this product will
          appear in low-stock alerts as soon as it is saved.
        </p>
      )}
      {minStock !== "" && (
        <p className="sr-only" aria-live="polite">
          Minimum stock {minStock}, reorder level {reorderLevel}
        </p>
      )}
    </FormSection>
  );
}
