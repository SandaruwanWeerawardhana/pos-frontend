"use client";

import type { ReactNode } from "react";
import { Controller, useWatch } from "react-hook-form";
import { Info, QrCode, Sparkles } from "lucide-react";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { FormSection, RequiredMark } from "./FormSection";
import {
  PRODUCT_STATUS_OPTIONS,
  PRODUCT_UNIT_OPTIONS,
} from "@/lib/products/constants";
import {
  generateBarcode,
  generateQrPayload,
  generateSku,
} from "@/lib/products/generate";
import type { CatalogueOptions } from "@/lib/hooks/use-product-catalogue-options";
import type { DuplicateState } from "@/lib/hooks/use-product-duplicates";
import type { ProductUnit } from "@/lib/types";
import type { ProductSectionProps } from "./types";

interface ProductInfoSectionProps extends ProductSectionProps {
  options: CatalogueOptions;
  duplicates: DuplicateState;
  errorCount: number;
}

function GenerateButton({
  onClick,
  label,
  icon,
}: Readonly<{ onClick: () => void; label: string; icon?: ReactNode }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-6 items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/10 dark:text-blue-400 dark:hover:bg-blue-500/10"
    >
      {icon ?? <Sparkles size={12} />}
      {label}
    </button>
  );
}

function toOptions(values: string[]) {
  return values.map((value) => ({ value, label: value }));
}

export function ProductInfoSection({
  form,
  options,
  duplicates,
  errorCount,
}: Readonly<ProductInfoSectionProps>) {
  const { control, register, setValue, formState, getValues } = form;
  const errors = formState.errors;

  // Only the fields the generators read are watched, so typing a description
  // does not re-render this section's derived bits.
  const [name, category, brand, sku, barcode] = useWatch({
    control,
    name: ["name", "category", "brand", "sku", "barcode"],
  });

  const skuError =
    errors.sku?.message ?? (duplicates.skuTaken ? "SKU already exists" : undefined);
  const barcodeError =
    errors.barcode?.message ??
    (duplicates.barcodeTaken ? "Barcode already exists" : undefined);

  function fillSku() {
    setValue("sku", generateSku({ name: name || "item", category, brand }), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function fillBarcode() {
    setValue("barcode", generateBarcode(), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function fillQr() {
    const current = getValues();
    setValue("qr_code", generateQrPayload(current.sku, current.barcode), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <FormSection
      id="product-information"
      title="Product information"
      description="Identity, classification, and how the item is counted"
      icon={<Info size={18} />}
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label={
              <>
                Product name
                <RequiredMark />
              </>
            }
            placeholder="e.g. Organic whole milk 2 L"
            autoComplete="off"
            enterKeyHint="next"
            error={errors.name?.message}
            {...register("name")}
          />
        </div>

        <Input
          label="Product code"
          placeholder="Internal code (optional)"
          autoComplete="off"
          hint="Your own merchandising reference, separate from the SKU."
          error={errors.product_code?.message}
          {...register("product_code")}
        />

        <Input
          label={
            <span className="flex items-center justify-between gap-2">
              <span>
                SKU
                <RequiredMark />
              </span>
              <GenerateButton onClick={fillSku} label="Generate" />
            </span>
          }
          placeholder="DAI-ANC-MILK-1042"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          error={skuError}
          {...register("sku")}
        />

        <Input
          label={
            <span className="flex items-center justify-between gap-2">
              <span>
                Barcode
                <RequiredMark />
              </span>
              <GenerateButton onClick={fillBarcode} label="Generate EAN-13" />
            </span>
          }
          placeholder="2000000000017"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          error={barcodeError}
          {...register("barcode")}
        />

        <Input
          label={
            <span className="flex items-center justify-between gap-2">
              <span>QR code</span>
              <GenerateButton
                onClick={fillQr}
                label="Generate"
                icon={<QrCode size={12} />}
              />
            </span>
          }
          placeholder="POS:PRODUCT:DAI-ANC-MILK-1042"
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          hint="Payload printed on the shelf-edge label."
          error={errors.qr_code?.message}
          {...register("qr_code")}
        />

        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Combobox
              label="Category"
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(options.categories)}
              placeholder="Search or add a category"
              allowCustom
              emptyMessage="Type to add a new category"
              error={errors.category?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="subcategory"
          render={({ field }) => (
            <Combobox
              label="Subcategory"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(options.subcategories)}
              placeholder="Search or add a subcategory"
              allowCustom
              emptyMessage="Type to add a new subcategory"
              error={errors.subcategory?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="brand"
          render={({ field }) => (
            <Combobox
              label="Brand"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(options.brands)}
              placeholder="Search or add a brand"
              allowCustom
              emptyMessage="Type to add a new brand"
              error={errors.brand?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="unit"
          render={({ field }) => (
            <Combobox
              label="Unit"
              required
              value={field.value}
              onChange={(value) => field.onChange(value as ProductUnit)}
              onBlur={field.onBlur}
              options={PRODUCT_UNIT_OPTIONS}
              placeholder="Search units"
              error={errors.unit?.message}
              hint="How the quantity is entered at the till."
            />
          )}
        />

        <Select
          label={
            <>
              Product status
              <RequiredMark />
            </>
          }
          options={PRODUCT_STATUS_OPTIONS}
          error={errors.status?.message}
          className="min-h-12"
          {...register("status")}
        />

        <div className="sm:col-span-2">
          <Textarea
            label="Product description"
            placeholder="Shown on the product page and the shelf label."
            hint="Optional — up to 1000 characters."
            error={errors.description?.message}
            {...register("description")}
          />
        </div>
      </div>

      {(sku || barcode) && (
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface-variant dark:bg-zinc-800/60 dark:text-zinc-400">
          {sku && <span>SKU {sku}</span>}
          {barcode && <span>EAN {barcode}</span>}
          {duplicates.checking && <span>checking uniqueness…</span>}
        </p>
      )}
    </FormSection>
  );
}
