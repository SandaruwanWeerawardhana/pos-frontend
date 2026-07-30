"use client";

import { Controller } from "react-hook-form";
import { ImageIcon } from "lucide-react";
import { ImageDropzone } from "@/components/ui/ImageDropzone";
import { useToast } from "@/components/ui/Toast";
import { FormSection } from "./FormSection";
import type { ProductSectionProps } from "./types";

interface MediaSectionProps extends ProductSectionProps {
  errorCount: number;
}

export function MediaSection({ form, errorCount }: Readonly<MediaSectionProps>) {
  const { control, formState } = form;
  const { showToast } = useToast();

  return (
    <FormSection
      id="media"
      title="Media"
      description="Shelf and till imagery — the first image is the primary one"
      icon={<ImageIcon size={18} />}
      errorCount={errorCount}
      plain
    >
      <Controller
        control={control}
        name="images"
        render={({ field }) => (
          <ImageDropzone
            value={field.value}
            onChange={field.onChange}
            onError={(message) => showToast(message, "error")}
            error={formState.errors.images?.message}
          />
        )}
      />
    </FormSection>
  );
}
