"use client";

import { Controller } from "react-hook-form";
import { BadgePercent, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/Switch";
import {
  PluginProductForm,
  type PluginFieldValues,
} from "@/components/plugin-slots/PluginProductForm";
import { FormSection } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface AdditionalSettingsSectionProps extends ProductSectionProps {
  pluginValues: PluginFieldValues;
  onPluginChange: (key: string, value: string | number | boolean) => void;
}

// Till policy switches plus whatever the active business-type plugin adds.
// The plugin slot is rendered here rather than at the bottom of the page so
// its fields sit inside the same card rhythm as everything else.
export function AdditionalSettingsSection({
  form,
  pluginValues,
  onPluginChange,
}: Readonly<AdditionalSettingsSectionProps>) {
  const { control } = form;

  return (
    <FormSection
      id="additional-settings"
      title="Additional settings"
      description="How the till is allowed to treat this product"
      icon={<SlidersHorizontal size={18} />}
      defaultOpen={false}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Controller
          control={control}
          name="allow_discount"
          render={({ field }) => (
            <Switch
              label="Allow discount"
              description="Cashiers may apply line discounts."
              icon={<BadgePercent size={16} />}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={control}
          name="allow_returns"
          render={({ field }) => (
            <Switch
              label="Allow returns"
              description="Item can be refunded after sale."
              icon={<RotateCcw size={16} />}
              checked={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="mt-4">
        <PluginProductForm values={pluginValues} onChange={onPluginChange} />
      </div>
    </FormSection>
  );
}
