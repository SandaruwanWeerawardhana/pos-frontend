"use client";

import { Controller, useWatch } from "react-hook-form";
import { Apple, CalendarClock, Scale, Snowflake } from "lucide-react";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/Switch";
import { FormSection } from "./FormSection";
import {
  PRODUCT_TYPE_DEFAULTS,
  PRODUCT_TYPE_OPTIONS,
  STORAGE_TYPE_OPTIONS,
} from "@/lib/products/constants";
import type { ProductType, StorageType } from "@/lib/types";
import type { ProductSectionProps } from "./types";

interface GrocerySectionProps extends ProductSectionProps {
  errorCount: number;
}

export function GrocerySection({
  form,
  errorCount,
}: Readonly<GrocerySectionProps>) {
  const { control, register, setValue, formState } = form;
  const errors = formState.errors;

  const [productType, isWeighted, trackBatch, trackExpiry] = useWatch({
    control,
    name: ["product_type", "is_weighted", "track_batch", "track_expiry"],
  });

  // Changing the type re-seeds handling defaults. It never overwrites anything
  // the user has typed — only the switches and the storage class.
  function applyTypeDefaults(nextType: ProductType) {
    setValue("product_type", nextType, { shouldDirty: true });
    const defaults = PRODUCT_TYPE_DEFAULTS[nextType];
    setValue("storage_type", defaults.storage_type, { shouldDirty: true });
    setValue("track_expiry", defaults.track_expiry, { shouldDirty: true });
    setValue("track_batch", defaults.track_batch, { shouldDirty: true });
    setValue("is_weighted", defaults.is_weighted, { shouldDirty: true });
    if (!defaults.is_weighted) {
      setValue("is_variable_weight", false, { shouldDirty: true });
    }
  }

  return (
    <FormSection
      id="grocery"
      title="Grocery information"
      description="Handling, weighing, batches, and shelf life"
      icon={<Apple size={18} />}
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="product_type"
          render={({ field }) => (
            <Combobox
              label="Product type"
              required
              value={field.value}
              onChange={(value) => applyTypeDefaults(value as ProductType)}
              onBlur={field.onBlur}
              options={PRODUCT_TYPE_OPTIONS}
              placeholder="Search product types"
              hint="Seeds the storage and tracking defaults below."
              error={errors.product_type?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="storage_type"
          render={({ field }) => (
            <Combobox
              label="Storage type"
              required
              value={field.value}
              onChange={(value) => field.onChange(value as StorageType)}
              onBlur={field.onBlur}
              options={STORAGE_TYPE_OPTIONS}
              placeholder="Search storage types"
              error={errors.storage_type?.message}
            />
          )}
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="is_weighted"
          render={({ field }) => (
            <Switch
              label="Weight-based product"
              description="Priced per unit of weight, read from the scale."
              icon={<Scale size={16} />}
              checked={field.value}
              onChange={(checked) => {
                field.onChange(checked);
                if (!checked) {
                  setValue("is_variable_weight", false, { shouldDirty: true });
                }
              }}
            />
          )}
        />

        <Controller
          control={control}
          name="is_variable_weight"
          render={({ field }) => (
            <Switch
              label="Variable weight product"
              description="Each pack weighs a different amount."
              icon={<Scale size={16} />}
              checked={field.value}
              disabled={!isWeighted}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="track_batch"
          render={({ field }) => (
            <Switch
              label="Track batch"
              description="Record which delivery each unit came from."
              icon={<Snowflake size={16} />}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="track_expiry"
          render={({ field }) => (
            <Switch
              label="Track expiry"
              description="Raise near-expiry alerts for this product."
              icon={<CalendarClock size={16} />}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Input
          label="Batch number"
          placeholder={trackBatch ? "Required" : "Optional"}
          autoComplete="off"
          className="font-mono"
          error={errors.batch_no?.message}
          {...register("batch_no")}
        />
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
          hint={trackExpiry ? "Required while expiry tracking is on." : undefined}
          error={errors.expiry_date?.message}
          {...register("expiry_date")}
        />
      </div>

      {(trackBatch || trackExpiry) && (
        <p className="mt-3 rounded-xl bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant dark:bg-zinc-800/60 dark:text-zinc-400">
          The opening stock will be recorded as the first batch, so expiry and
          batch reports have something to report on from day one.
        </p>
      )}
      {productType !== "regular" && (
        <p className="sr-only" aria-live="polite">
          Handling defaults applied for {productType.replace("_", " ")}
        </p>
      )}
    </FormSection>
  );
}
