import { z } from "zod";
import { parseMoneyToCents } from "@/lib/format";
import { MAX_IMAGES } from "./constants";
import type { Product, ProductBatch } from "@/lib/types";

// Numeric inputs are held as strings so a half-typed value ("1.", "") is a
// legal intermediate state rather than NaN. Conversion to integer cents /
// numbers happens once, in `toProduct`.

function toNumber(value: string): number | null {
  const cleaned = value.trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function moneyField(label: string, required: boolean) {
  return z
    .string()
    .trim()
    .refine((value) => !required || value.length > 0, `${label} is required`)
    .refine(
      (value) => value === "" || parseMoneyToCents(value) !== null,
      `${label} must be a number`,
    )
    .refine(
      (value) => value === "" || (parseMoneyToCents(value) ?? 0) >= 0,
      `${label} cannot be negative`,
    );
}

interface QuantityOptions {
  required?: boolean;
  integer?: boolean;
  max?: number;
}

function quantityField(label: string, options: QuantityOptions = {}) {
  const { required = false, integer = false, max } = options;
  return z
    .string()
    .trim()
    .refine((value) => !required || value.length > 0, `${label} is required`)
    .refine(
      (value) => value === "" || toNumber(value) !== null,
      `${label} must be a number`,
    )
    .refine(
      (value) => value === "" || (toNumber(value) ?? 0) >= 0,
      `${label} cannot be negative`,
    )
    .refine(
      (value) => !integer || value === "" || Number.isInteger(toNumber(value)),
      `${label} must be a whole number`,
    )
    .refine(
      (value) => max === undefined || value === "" || (toNumber(value) ?? 0) <= max,
      `${label} cannot exceed ${max}`,
    );
}

const isoDate = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || !Number.isNaN(Date.parse(value)),
    "Enter a valid date",
  );

const baseProductSchema = z.object({
  // Product information
  name: z.string().trim().min(2, "Product name is required").max(120),
  product_code: z.string().trim().max(40),
  sku: z
    .string()
    .trim()
    .min(2, "SKU is required")
    .max(48)
    .regex(/^[A-Za-z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore"),
  barcode: z
    .string()
    .trim()
    .min(6, "Barcode is required")
    .max(32)
    .regex(/^[0-9]+$/, "Barcode must be digits only"),
  qr_code: z.string().trim().max(200),
  category: z.string().trim().min(1, "Category is required").max(60),
  subcategory: z.string().trim().max(60),
  brand: z.string().trim().max(60),
  unit: z.enum(["unit", "kg", "g", "l", "ml", "pack", "box"]),
  status: z.enum(["active", "inactive", "draft"]),
  description: z.string().trim().max(1000),

  // Pricing
  selling_price: moneyField("Price", true),
  tax_rate: quantityField("Tax rate", { required: true, max: 100 }),
  discount_percent: quantityField("Discount", { max: 100 }),

  // Inventory
  initial_stock: quantityField("Initial stock", { required: true }),
  min_stock_level: quantityField("Minimum stock", { integer: true }),
  reorder_level: quantityField("Reorder level", { integer: true }),
  shelf_location: z.string().trim().max(40),
  warehouse_id: z.string().trim(),
  branch: z.string().trim().max(60),

  // Grocery
  product_type: z.enum([
    "regular",
    "fresh_produce",
    "frozen",
    "dairy",
    "bakery",
    "beverage",
    "meat",
    "seafood",
    "household",
    "personal_care",
  ]),
  storage_type: z.enum(["ambient", "chilled", "frozen"]),
  is_weighted: z.boolean(),
  is_variable_weight: z.boolean(),
  batch_no: z.string().trim().max(40),
  expiry_date: isoDate,
  manufacturing_date: isoDate,
  allow_discount: z.boolean(),
  allow_returns: z.boolean(),
  track_expiry: z.boolean(),
  track_batch: z.boolean(),

  // Supplier
  supplier_id: z.string().trim(),
  purchase_price: moneyField("Purchase price", false),
  supplier_product_code: z.string().trim().max(60),

  // Media — data URLs, already size/type checked at upload time.
  images: z.array(z.string()).max(MAX_IMAGES, `Up to ${MAX_IMAGES} images`),
});

function startOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export const productFormSchema = baseProductSchema.superRefine((values, ctx) => {
  const minStock = toNumber(values.min_stock_level);
  const reorder = toNumber(values.reorder_level);
  if (minStock !== null && reorder !== null && reorder < minStock) {
    ctx.addIssue({
      code: "custom",
      path: ["reorder_level"],
      message: "Reorder level must be at or above the minimum stock level",
    });
  }

  if (values.track_batch && !values.batch_no) {
    ctx.addIssue({
      code: "custom",
      path: ["batch_no"],
      message: "Batch number is required when batch tracking is on",
    });
  }

  if (values.track_expiry && !values.expiry_date) {
    ctx.addIssue({
      code: "custom",
      path: ["expiry_date"],
      message: "Expiry date is required when expiry tracking is on",
    });
  }

  if (values.expiry_date && Date.parse(values.expiry_date) < startOfToday()) {
    ctx.addIssue({
      code: "custom",
      path: ["expiry_date"],
      message: "Expiry date cannot be in the past",
    });
  }

  if (
    values.manufacturing_date &&
    Date.parse(values.manufacturing_date) > startOfToday()
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["manufacturing_date"],
      message: "Manufacturing date cannot be in the future",
    });
  }

  if (
    values.expiry_date &&
    values.manufacturing_date &&
    Date.parse(values.expiry_date) <= Date.parse(values.manufacturing_date)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["expiry_date"],
      message: "Expiry date must come after the manufacturing date",
    });
  }

  if (values.is_variable_weight && !values.is_weighted) {
    ctx.addIssue({
      code: "custom",
      path: ["is_variable_weight"],
      message: "Variable weight only applies to weight-based products",
    });
  }
});

export type ProductFormValues = z.infer<typeof baseProductSchema>;

export const DEFAULT_PRODUCT_FORM_VALUES: ProductFormValues = {
  name: "",
  product_code: "",
  sku: "",
  barcode: "",
  qr_code: "",
  category: "",
  subcategory: "",
  brand: "",
  unit: "unit",
  status: "active",
  description: "",
  selling_price: "",
  tax_rate: "8",
  discount_percent: "",
  initial_stock: "0",
  min_stock_level: "",
  reorder_level: "5",
  shelf_location: "",
  warehouse_id: "",
  branch: "",
  product_type: "regular",
  storage_type: "ambient",
  is_weighted: false,
  is_variable_weight: false,
  batch_no: "",
  expiry_date: "",
  manufacturing_date: "",
  allow_discount: true,
  allow_returns: true,
  track_expiry: false,
  track_batch: false,
  supplier_id: "",
  purchase_price: "",
  supplier_product_code: "",
  images: [],
};

// ── Derived pricing ────────────────────────────────────────────────────────

export interface PricingSummary {
  priceCents: number | null;
  /** Price after the standing discount, which is what the till will charge. */
  netPriceCents: number | null;
  taxCents: number | null;
  grossPriceCents: number | null;
}

export function summarisePricing(
  values: Pick<ProductFormValues, "selling_price" | "tax_rate" | "discount_percent">,
): PricingSummary {
  const priceCents = parseMoneyToCents(values.selling_price);
  const discount = toNumber(values.discount_percent) ?? 0;
  const taxPercent = toNumber(values.tax_rate) ?? 0;

  if (priceCents === null) {
    return {
      priceCents: null,
      netPriceCents: null,
      taxCents: null,
      grossPriceCents: null,
    };
  }

  const netPriceCents = Math.round(priceCents * (1 - discount / 100));
  const taxCents = Math.round(netPriceCents * (taxPercent / 100));
  const grossPriceCents = netPriceCents + taxCents;

  return {
    priceCents,
    netPriceCents,
    taxCents,
    grossPriceCents,
  };
}

// ── Mapping to the stored entity ───────────────────────────────────────────

function optional<T>(value: T | "" | null | undefined): T | undefined {
  return value === "" || value === null || value === undefined
    ? undefined
    : value;
}

// Strips empty strings so a blank optional field is absent from the record
// rather than stored as "", which keeps `??` fallbacks working everywhere.
export function toProduct(values: ProductFormValues, id: string): Product {
  const priceCents = parseMoneyToCents(values.selling_price) ?? 0;
  const purchaseCents = parseMoneyToCents(values.purchase_price);
  const stock = toNumber(values.initial_stock) ?? 0;

  const batches: ProductBatch[] | undefined =
    values.track_batch || values.track_expiry
      ? [
          {
            batch_no: values.batch_no || `${values.sku}-B1`,
            expiry_date: optional(values.expiry_date) ?? null,
            quantity: stock,
            ...(values.manufacturing_date
              ? { manufactured_date: values.manufacturing_date }
              : {}),
          },
        ]
      : undefined;

  return {
    id,
    name: values.name,
    sku: values.sku,
    barcode: values.barcode,
    price_cents: priceCents,
    tax_rate: (toNumber(values.tax_rate) ?? 0) / 100,
    stock_quantity: stock,
    category: values.category,
    unit: values.unit,
    status: values.status,
    is_weighted: values.is_weighted,
    is_variable_weight: values.is_variable_weight,
    product_type: values.product_type,
    storage_type: values.storage_type,
    allow_discount: values.allow_discount,
    allow_returns: values.allow_returns,
    track_expiry: values.track_expiry,
    track_batch: values.track_batch,
    ...(purchaseCents !== null ? { purchase_price_cents: purchaseCents } : {}),
    ...(optional(values.brand) ? { brand: values.brand } : {}),
    ...(optional(values.subcategory) ? { subcategory: values.subcategory } : {}),
    ...(optional(values.product_code) ? { product_code: values.product_code } : {}),
    ...(optional(values.qr_code) ? { qr_code: values.qr_code } : {}),
    ...(optional(values.description) ? { description: values.description } : {}),
    ...(optional(values.shelf_location)
      ? { shelf_location: values.shelf_location }
      : {}),
    ...(optional(values.warehouse_id) ? { warehouse_id: values.warehouse_id } : {}),
    ...(optional(values.branch) ? { branch: values.branch } : {}),
    ...(optional(values.supplier_id) ? { supplier_id: values.supplier_id } : {}),
    ...(optional(values.supplier_product_code)
      ? { supplier_product_code: values.supplier_product_code }
      : {}),
    ...(toNumber(values.discount_percent) !== null
      ? { discount_percent: toNumber(values.discount_percent) as number }
      : {}),
    ...(toNumber(values.min_stock_level) !== null
      ? { min_stock_level: toNumber(values.min_stock_level) as number }
      : {}),
    ...(toNumber(values.reorder_level) !== null
      ? { reorder_level: toNumber(values.reorder_level) as number }
      : {}),
    ...(values.images.length > 0
      ? { images: values.images, image_url: values.images[0] }
      : {}),
    ...(batches ? { batches } : {}),
  };
}
