"use client";

import { SlidersHorizontal } from "lucide-react";
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

/**
 * Till policy switches plus whatever the active business-type plugin adds.
 * The plugin slot is rendered here rather than at the bottom of the page so
 * its fields sit inside the same card rhythm as everything else.
 */
export function AdditionalSettingsSection({
  pluginValues,
  onPluginChange,
}: Readonly<AdditionalSettingsSectionProps>) {
  return (
    <FormSection
      id="additional-settings"
      title="Additional settings"
      description="How the till is allowed to treat this product"
      icon={<SlidersHorizontal size={18} />}
      plain
    >
      <PluginProductForm values={pluginValues} onChange={onPluginChange} />
    </FormSection>
  );
}
