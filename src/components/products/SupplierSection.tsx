"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { Plus, Truck } from "lucide-react";
import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { FormSection } from "./FormSection";
import { SupplierQuickAddModal } from "./SupplierQuickAddModal";
import type { CatalogueOptions } from "@/lib/hooks/use-product-catalogue-options";
import type { ProductSectionProps } from "./types";

interface SupplierSectionProps extends ProductSectionProps {
  options: CatalogueOptions;
  errorCount: number;
}

export function SupplierSection({
  form,
  options,
  errorCount,
}: Readonly<SupplierSectionProps>) {
  const { control, register, setValue, formState } = form;
  const errors = formState.errors;
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <FormSection
      id="supplier"
      title="Supplier"
      description="Who you buy it from and at what price"
      icon={<Truck size={18} />}
      errorCount={errorCount}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Controller
          control={control}
          name="supplier_id"
          render={({ field }) => (
            <Combobox
              label="Supplier"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              options={options.suppliers.map((supplier) => ({
                value: supplier.id,
                label: supplier.name,
                hint: supplier.contact_name ?? supplier.phone,
              }))}
              placeholder="Search suppliers"
              emptyMessage="No supplier matches"
              error={errors.supplier_id?.message}
              footer={
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setQuickAddOpen(true)}
                  className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary/10 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  <Plus size={15} />
                  Add a new supplier
                </button>
              }
            />
          )}
        />

        <Input
          label="Purchase price"
          placeholder="0.00"
          inputMode="decimal"
          autoComplete="off"
          className="text-right tabular-nums"
          hint="Supplier list price per unit."
          error={errors.purchase_price?.message}
          {...register("purchase_price")}
        />

        <Input
          label="Supplier product code"
          placeholder="Their reference"
          autoComplete="off"
          className="font-mono"
          error={errors.supplier_product_code?.message}
          {...register("supplier_product_code")}
        />
      </div>

      <SupplierQuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onCreated={(supplier) => {
          setValue("supplier_id", supplier.id, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setQuickAddOpen(false);
        }}
      />
    </FormSection>
  );
}
