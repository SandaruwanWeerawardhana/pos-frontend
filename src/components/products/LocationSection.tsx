"use client";

import { Combobox } from "@/components/ui/Combobox";
import type { Warehouse } from "@/lib/types";
import { MapPin } from "lucide-react";
import { Controller } from "react-hook-form";
import { FormSection } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface LocationSectionProps extends ProductSectionProps {
  warehouses: Warehouse[];
  /** Rack/shelf references already used in the catalogue, for the typeahead. */
  knownLocations: string[];
  errorCount: number;
}

/**
 * Rack/shelf reference per warehouse. Reference data only: stock is tracked by
 * warehouse, never by location, so an empty or stale value here can never make
 * a quantity wrong.
 */
export function LocationSection({
  form,
  warehouses,
  knownLocations,
  errorCount,
}: Readonly<LocationSectionProps>) {
  const { control, formState } = form;
  const errors = formState.errors;

  return (
    <FormSection
      id="location"
      title="Internal Location (Rack/Shelf)"
      icon={<MapPin size={18} />}
      errorCount={errorCount}
    >
      <p className="mb-3 rounded-xl bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant dark:bg-zinc-800/60 dark:text-zinc-400">
        Optional. Identifies where the product sits in the warehouse (rack /
        shelf / zone / bin) for faster picking during stock counts. Stock is
        still tracked by warehouse, not by location.
      </p>

      {warehouses.length === 0 ? (
        <p className="text-sm text-on-surface-variant dark:text-zinc-400">
          No warehouses to place this product in yet.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {warehouses.map((warehouse) => (
            <Controller
              key={warehouse.id}
              control={control}
              name={`rack_locations.${warehouse.id}`}
              render={({ field }) => (
                <Combobox
                  label={warehouse.name}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={knownLocations.map((location) => ({
                    value: location,
                    label: location,
                  }))}
                  placeholder="Choose"
                  allowCustom
                  emptyMessage="Type a rack or shelf reference"
                  error={errors.rack_locations?.[warehouse.id]?.message}
                />
              )}
            />
          ))}
        </div>
      )}
    </FormSection>
  );
}
