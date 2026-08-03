"use client";

import { Input } from "@/components/ui/Input";
import { NumberField } from "@/components/ui/NumberField";
import { Select } from "@/components/ui/Select";
import {
  PRODUCT_TYPE_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
} from "@/lib/products/constants";
import { Package } from "lucide-react";
import { Controller, useWatch } from "react-hook-form";
import { FormSection, RequiredMark } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface InventorySectionProps extends ProductSectionProps {
  errorCount: number;
}

/**
 * Product type, the three units, the low-stock trigger and the shipping
 * envelope. Opening quantities live in their own section because they are
 * per-warehouse; everything here is a property of the product itself.
 *
 * A service carries no stock, so the alert and the shipping figures are hidden
 * for it rather than collected and ignored.
 */
export function InventorySection({
  form,
  errorCount,
}: Readonly<InventorySectionProps>) {
  const { control, register, formState } = form;
  const errors = formState.errors;

  const [productType, unit] = useWatch({ control, name: ["product_type", "unit"] });
  const stocked = productType !== "service";
  const weighedUnit = unit !== "unit";

  return (
    <FormSection
      id="inventory"
      title="Inventory"
      icon={<Package size={18} />}
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="product_type"
          render={({ field }) => (
            <Select
              label={
                <>
                  Type
                  <RequiredMark />
                </>
              }
              options={PRODUCT_TYPE_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.product_type?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <Select
              label={
                <>
                  Product Unit
                  <RequiredMark />
                </>
              }
              options={PRODUCT_UNIT_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.unit?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="sale_unit"
          render={({ field }) => (
            <Select
              label={
                <>
                  Sale Unit
                  <RequiredMark />
                </>
              }
              options={PRODUCT_UNIT_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.sale_unit?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="purchase_unit"
          render={({ field }) => (
            <Select
              label={
                <>
                  Purchase Unit
                  <RequiredMark />
                </>
              }
              options={PRODUCT_UNIT_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.purchase_unit?.message}
            />
          )}
        />

        {stocked && (
          <>
            <Controller
              control={control}
              name="stock_alert"
              render={({ field }) => (
                <NumberField
                  label="Stock Alert"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="0"
                  hint="Flags the product as low once stock falls to this level."
                  suffix={weighedUnit ? unit : undefined}
                  error={errors.stock_alert?.message}
                />
              )}
            />

            <Input
              label="Weight"
              placeholder="0.00"
              hint="Shipping weight in kilograms."
              inputMode="decimal"
              autoComplete="off"
              className="text-right tabular-nums"
              error={errors.weight?.message}
              {...register("weight")}
            />
          </>
        )}
      </div>

      {stocked && (
        <fieldset className="mt-4">
          <legend className="mb-2 text-sm font-medium text-on-surface-variant dark:text-zinc-300">
            Dimensions (in)
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Length"
              placeholder="0.00"
              inputMode="decimal"
              autoComplete="off"
              className="text-right tabular-nums"
              error={errors.length?.message}
              {...register("length")}
            />
            <Input
              label="Width"
              placeholder="0.00"
              inputMode="decimal"
              autoComplete="off"
              className="text-right tabular-nums"
              error={errors.width?.message}
              {...register("width")}
            />
            <Input
              label="Height"
              placeholder="0.00"
              inputMode="decimal"
              autoComplete="off"
              className="text-right tabular-nums"
              error={errors.height?.message}
              {...register("height")}
            />
          </div>
        </fieldset>
      )}
    </FormSection>
  );
}
