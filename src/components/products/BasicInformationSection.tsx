"use client";

import { BarcodeScanner } from "@/components/hardware/BarcodeScanner";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import type { CatalogueOptions } from "@/lib/hooks/use-product-catalogue-options";
import type { DuplicateState } from "@/lib/hooks/use-product-duplicates";
import { BARCODE_SYMBOLOGY_OPTIONS, SYMBOLOGY_LENGTHS } from "@/lib/products/constants";
import {
  generateBarcode,
  generateSku,
  isGtinLength,
  isValidGtin,
} from "@/lib/products/generate";
import type { BarcodeSource } from "@/lib/products/schema";
import { FileText, ScanLine, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Controller, useWatch } from "react-hook-form";
import { FormSection, RequiredMark } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface BasicInformationSectionProps extends ProductSectionProps {
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
      className="inline-flex min-h-6 items-center gap-1 rounded-md px-1.5 text-xs font-semibold text-secondary transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:bg-secondary/10 active:scale-95 dark:text-blue-400 dark:hover:bg-blue-500/10"
    >
      {icon ?? <Sparkles size={12} />}
      {label}
    </button>
  );
}

const BARCODE_SOURCES: { value: BarcodeSource; label: string }[] = [
  { value: "package", label: "On package" },
  { value: "generated", label: "In-store" },
];

function BarcodeSourceToggle({
  value,
  onChange,
}: Readonly<{ value: BarcodeSource; onChange: (next: BarcodeSource) => void }>) {
  return (
    <div
      role="radiogroup"
      aria-label="Product code source"
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
            className={`min-h-7 rounded-md px-2 text-xs font-semibold transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] active:scale-95 ${
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

/**
 * Name, code, taxonomy and description, plus the generators and the scanner.
 *
 * "Code product" is the scannable code itself — the SKU beside it is the
 * internal reference the catalogue and the API key on, which is why both are
 * asked for rather than one being derived from the other at save time.
 *
 * Only the fields the generators read are watched, so typing a description
 * does not re-render this section's derived bits.
 */
export function BasicInformationSection({
  form,
  options,
  duplicates,
  errorCount,
}: Readonly<BasicInformationSectionProps>) {
  const { control, register, setValue, formState } = form;
  const errors = formState.errors;
  const nameField = register("name");

  const [name, category, brand, sku, barcode, barcodeSource, symbology] = useWatch({
    control,
    name: [
      "name",
      "category",
      "brand",
      "sku",
      "barcode",
      "barcode_source",
      "barcode_symbology",
    ],
  });
  const [scanning, setScanning] = useState(false);

  const skuError =
    errors.sku?.message ?? (duplicates.skuTaken ? "SKU already exists" : undefined);
  const barcodeError =
    errors.barcode?.message ??
    (duplicates.barcodeTaken ? "Product code already exists" : undefined);

  function fillSku() {
    setValue("sku", generateSku({ name: name || "item", category, brand }), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  /**
   * Fires on name blur so a fresh product gets a SKU without an extra click.
   * Skipped once the field holds anything, generated or hand-typed, so it
   * never clobbers a value the user already set.
   */
  function autoFillSku() {
    if (sku || !name) return;
    fillSku();
  }

  function writeBarcode(value: string) {
    setValue("barcode", value, { shouldDirty: true, shouldValidate: true });
  }

  /**
   * A minted code is always an EAN-13, so the symbology moves with it —
   * printing an in-store EAN-13 as Code 39 would produce a label the till
   * cannot read back.
   */
  function fillBarcode() {
    writeBarcode(generateBarcode());
    setValue("barcode_symbology", "EAN13", { shouldDirty: true, shouldValidate: true });
  }

  function pickSource(next: BarcodeSource) {
    setValue("barcode_source", next, { shouldDirty: true, shouldValidate: true });
    setScanning(false);
    if (next === "generated" && !barcode) fillBarcode();
  }

  function handleScan(code: string) {
    const scanned = code.trim();
    if (!scanned) return;
    writeBarcode(scanned);
    setScanning(false);
  }

  const packageMode = barcodeSource === "package";
  const fixedLength = SYMBOLOGY_LENGTHS[symbology ?? "CODE128"];
  const checkable = isGtinLength(barcode ?? "");

  return (
    <FormSection
      id="basic-information"
      title="Basic Information"
      icon={<FileText size={18} />}
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={
            <>
              Name
              <RequiredMark />
            </>
          }
          placeholder="Enter Name Product"
          autoComplete="off"
          enterKeyHint="next"
          error={errors.name?.message}
          {...nameField}
          onBlur={(event) => {
            nameField.onBlur(event);
            autoFillSku();
          }}
        />

        <Controller
          control={control}
          name="barcode_symbology"
          render={({ field }) => (
            <Select
              label={
                <>
                  Barcode Symbology
                  <RequiredMark />
                </>
              }
              options={BARCODE_SYMBOLOGY_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.barcode_symbology?.message}
            />
          )}
        />

        <div className="flex flex-col gap-2">
          <Input
            label={
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  Code Product
                  <RequiredMark />
                </span>
                <BarcodeSourceToggle
                  value={barcodeSource ?? "package"}
                  onChange={pickSource}
                />
              </span>
            }
            placeholder={fixedLength ? "5901234123457" : "75724471"}
            hint={
              fixedLength
                ? `${symbology} — exactly ${fixedLength} digits.`
                : "Scan the package code, or type your own shelf code."
            }
            inputMode={fixedLength ? "numeric" : "text"}
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
          hint="Internal reference used by the catalogue and stock reports."
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          error={skuError}
          {...register("sku")}
        />

        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Combobox
              label="Categories"
              required
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(options.categories)}
              placeholder="Choose Category"
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
              label="Subcategories"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={toOptions(options.subcategories)}
              placeholder="Choose Sub Category"
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
              placeholder="Choose Brand"
              allowCustom
              emptyMessage="Type to add a new brand"
              error={errors.brand?.message}
            />
          )}
        />

        <div className="sm:col-span-2">
          <Textarea
            label="Description"
            placeholder="A few words …"
            hint="Optional — up to 1000 characters."
            error={errors.description?.message}
            {...register("description")}
          />
        </div>
      </div>

      {(sku || barcode) && (
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-surface-container-low px-3 py-2 font-mono text-xs text-on-surface-variant dark:bg-zinc-800/60 dark:text-zinc-400">
          {sku && <span>SKU {sku}</span>}
          {barcode && <span>CODE {barcode}</span>}
          {duplicates.checking && <span>checking uniqueness…</span>}
        </p>
      )}
    </FormSection>
  );
}
