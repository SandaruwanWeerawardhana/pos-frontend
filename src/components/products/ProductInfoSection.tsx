"use client";

import { BarcodeScanner } from "@/components/hardware/BarcodeScanner";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import type { CatalogueOptions } from "@/lib/hooks/use-product-catalogue-options";
import type { DuplicateState } from "@/lib/hooks/use-product-duplicates";
import { PRODUCT_UNIT_OPTIONS } from "@/lib/products/constants";
import {
  generateBarcode,
  generateSku,
  isGtinLength,
  isValidGtin,
} from "@/lib/products/generate";
import type { BarcodeSource } from "@/lib/products/schema";
import type { ProductUnit } from "@/lib/types";
import { Info, ScanLine, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useWatch } from "react-hook-form";
import { FormSection, RequiredMark } from "./FormSection";
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

const BARCODE_SOURCES: { value: BarcodeSource; label: string }[] = [
  { value: "package", label: "On package" },
  { value: "generated", label: "Generate internal" },
];

function BarcodeSourceToggle({
  value,
  onChange,
}: Readonly<{ value: BarcodeSource; onChange: (next: BarcodeSource) => void }>) {
  return (
    <div
      role="radiogroup"
      aria-label="Barcode source"
      className="inline-flex gap-0.5 rounded-lg border border-outline-variant bg-surface-container-low p-0.5 dark:border-zinc-700 dark:bg-zinc-800/60"
    >
      {BARCODE_SOURCES.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`min-h-7 rounded-md px-2 text-xs font-semibold transition-colors ${
              selected
                ? "bg-secondary text-on-secondary dark:bg-blue-500 dark:text-white"
                : "text-on-surface-variant hover:bg-secondary/10 dark:text-zinc-400 dark:hover:bg-blue-500/10"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
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
  const { control, register, setValue, formState } = form;
  const errors = formState.errors;

  // Only the fields the generators read are watched, so typing a description
  // does not re-render this section's derived bits.
  const [name, category, brand, sku, barcode, barcodeSource] = useWatch({
    control,
    name: ["name", "category", "brand", "sku", "barcode", "barcode_source"],
  });
  const [scanning, setScanning] = useState(false);

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

  function writeBarcode(value: string) {
    setValue("barcode", value, { shouldDirty: true, shouldValidate: true });
  }

  function fillBarcode() {
    writeBarcode(generateBarcode());
  }

  function pickSource(next: BarcodeSource) {
    setValue("barcode_source", next, { shouldDirty: true, shouldValidate: true });
    setScanning(false);
    // Switching to an in-store code with nothing typed yet: mint one straight
    // away, since that is the only reason to pick this mode.
    if (next === "generated" && !barcode) fillBarcode();
  }

  function handleScan(code: string) {
    const digits = code.replace(/\D/g, "");
    if (!digits) return;
    writeBarcode(digits);
    setScanning(false);
  }

  const packageMode = barcodeSource === "package";
  const checkable = packageMode && isGtinLength(barcode ?? "");

  return (
    <FormSection
      id="product-information"
      title="Product information"
      icon={<Info size={18} />}
      errorCount={errorCount}
      plain
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

        <div className="flex flex-col gap-2">
          <Input
            label={
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Barcode
                  <RequiredMark />
                </span>
                <BarcodeSourceToggle
                  value={barcodeSource ?? "package"}
                  onChange={pickSource}
                />
              </span>
            }
            placeholder={packageMode ? "5901234123457" : "2000000000017"}
            hint={
              packageMode
                ? "Scan or type the code printed on the package."
                : "In-store EAN-13 (GS1 prefix 200) for items with no printed code."
            }
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            error={barcodeError}
            {...register("barcode")}
          />

          <div className="flex flex-wrap items-center gap-2">
            {packageMode ? (
              <GenerateButton
                onClick={() => setScanning((active) => !active)}
                label={scanning ? "Stop scanning" : "Scan"}
                icon={<ScanLine size={12} />}
              />
            ) : (
              <GenerateButton onClick={fillBarcode} label="Generate EAN-13" />
            )}
            {checkable && !barcodeError && (
              <span
                className={`text-xs font-medium ${
                  isValidGtin(barcode)
                    ? "text-green-700 dark:text-green-400"
                    : "text-on-surface-variant dark:text-zinc-400"
                }`}
              >
                {isValidGtin(barcode) ? "Check digit valid" : "Check digit unverified"}
              </span>
            )}
          </div>

          {/* Mounted only while scanning so the keyboard-wedge listener cannot
              swallow ordinary typing elsewhere in the form. */}
          {packageMode && scanning && (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-outline-variant p-3 dark:border-zinc-700">
              <p
                aria-live="polite"
                className="text-xs text-on-surface-variant dark:text-zinc-400"
              >
                Waiting for a scan — trigger the USB scanner, or use the camera.
              </p>
              <BarcodeScanner onScan={handleScan} />
            </div>
          )}
        </div>

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
            />
          )}
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
