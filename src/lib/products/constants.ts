import type { ProductUnit } from "@/lib/types";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const PRODUCT_UNIT_OPTIONS: Option<ProductUnit>[] = [
  { value: "unit", label: "Unit (each)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Litre (l)" },
  { value: "ml", label: "Millilitre (ml)" },
  { value: "pack", label: "Pack" },
  { value: "box", label: "Box" },
];

/**
 * Weight-priced units — selecting one of these implies a weighed product.
 */
export const WEIGHT_UNITS: ProductUnit[] = ["kg", "g", "l", "ml"];

/**
 * Per-image upload ceiling, 2 MB.
 */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_IMAGES = 6;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
