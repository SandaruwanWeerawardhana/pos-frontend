import type {
  ProductStatus,
  ProductType,
  ProductUnit,
  StorageType,
} from "@/lib/types";

export interface Option<T extends string> {
  value: T;
  label: string;
}

export const PRODUCT_STATUS_OPTIONS: Option<ProductStatus>[] = [
  { value: "active", label: "Active — sellable at the till" },
  { value: "draft", label: "Draft — saved but hidden from POS" },
  { value: "inactive", label: "Inactive — delisted" },
];

export const PRODUCT_UNIT_OPTIONS: Option<ProductUnit>[] = [
  { value: "unit", label: "Unit (each)" },
  { value: "kg", label: "Kilogram (kg)" },
  { value: "g", label: "Gram (g)" },
  { value: "l", label: "Litre (l)" },
  { value: "ml", label: "Millilitre (ml)" },
  { value: "pack", label: "Pack" },
  { value: "box", label: "Box" },
];

export const PRODUCT_TYPE_OPTIONS: Option<ProductType>[] = [
  { value: "regular", label: "Regular" },
  { value: "fresh_produce", label: "Fresh produce" },
  { value: "frozen", label: "Frozen" },
  { value: "dairy", label: "Dairy" },
  { value: "bakery", label: "Bakery" },
  { value: "beverage", label: "Beverage" },
  { value: "meat", label: "Meat" },
  { value: "seafood", label: "Seafood" },
  { value: "household", label: "Household" },
  { value: "personal_care", label: "Personal care" },
];

export const STORAGE_TYPE_OPTIONS: Option<StorageType>[] = [
  { value: "ambient", label: "Ambient (room temperature)" },
  { value: "chilled", label: "Chilled (2–8 °C)" },
  { value: "frozen", label: "Frozen (−18 °C)" },
];

// Picking a product type is the strongest signal a grocer gives about how the
// item is handled, so it seeds the storage and tracking switches. Every value
// stays editable afterwards — this only saves typing on the common case.
export interface ProductTypeDefaults {
  storage_type: StorageType;
  track_expiry: boolean;
  track_batch: boolean;
  is_weighted: boolean;
}

const PERISHABLE: ProductTypeDefaults = {
  storage_type: "chilled",
  track_expiry: true,
  track_batch: true,
  is_weighted: false,
};

export const PRODUCT_TYPE_DEFAULTS: Record<ProductType, ProductTypeDefaults> = {
  regular: {
    storage_type: "ambient",
    track_expiry: false,
    track_batch: false,
    is_weighted: false,
  },
  fresh_produce: { ...PERISHABLE, storage_type: "ambient", is_weighted: true },
  frozen: { ...PERISHABLE, storage_type: "frozen" },
  dairy: PERISHABLE,
  bakery: { ...PERISHABLE, storage_type: "ambient", track_batch: false },
  beverage: {
    storage_type: "ambient",
    track_expiry: true,
    track_batch: false,
    is_weighted: false,
  },
  meat: { ...PERISHABLE, is_weighted: true },
  seafood: { ...PERISHABLE, is_weighted: true },
  household: {
    storage_type: "ambient",
    track_expiry: false,
    track_batch: false,
    is_weighted: false,
  },
  personal_care: {
    storage_type: "ambient",
    track_expiry: true,
    track_batch: false,
    is_weighted: false,
  },
};

// Weight-priced units — selecting one of these implies a weighed product.
export const WEIGHT_UNITS: ProductUnit[] = ["kg", "g", "l", "ml"];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB per image
export const MAX_IMAGES = 6;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
