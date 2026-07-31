import { z } from "zod";
import { parseMoneyToCents } from "@/lib/format";
import { MAX_IMAGES, WEIGHT_UNITS } from "./constants";
import { isGtinLength, isValidEan13, isValidGtin } from "./generate";
import type { Product, ProductBatch } from "@/lib/types";

// Every field below is backed by a rendered input. Fields the form once
// declared but never rendered a control for (product_code, qr_code,
// subcategory, brand, status, reorder_level, shelf_location, warehouse_id,
// branch, product_type, storage_type, is_variable_weight, batch_no,
// allow_discount, allow_returns, track_expiry, track_batch, supplier_id,
// supplier_product_code) were removed: they could only ever be saved at their
// default, which made two of the superRefine rules below unreachable and the
// catalogue's brand/weighted/margin figures permanently empty. Add the input
// and the field back together if one is ever needed.

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
  // Where the barcode came from: "package" is the GTIN already printed on the
  // supplier's packaging, "generated" is an in-store code we print ourselves.
  barcode_source: z.enum(["package", "generated"]),
  category: z.string().trim().min(1, "Category is required").max(60),
  unit: z.enum(["unit", "kg", "g", "l", "ml", "pack", "box"]),
  description: z.string().trim().max(1000),

  // Pricing
  selling_price: moneyField("Price", true),
  cost_price: moneyField("Cost price", false),
  tax_rate: quantityField("Tax rate", { max: 100 }),
  discount_percent: quantityField("Discount", { max: 100 }),

  // Inventory
  initial_stock: quantityField("Initial stock", { required: true }),
  min_stock_level: quantityField("Minimum stock", { integer: true }),

  // Grocery
  expiry_date: isoDate,
  manufacturing_date: isoDate,

  // Media — data URLs, already size/type checked at upload time.
  images: z.array(z.string()).max(MAX_IMAGES, `Up to ${MAX_IMAGES} images`),
});

function startOfToday(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
}

export const productFormSchema = baseProductSchema.superRefine((values, ctx) => {
  // An in-store code we print must be a well-formed EAN-13, or the shelf label
  // will not scan. A package code is only checkable at real GTIN lengths.
  if (values.barcode_source === "generated" && !isValidEan13(values.barcode)) {
    ctx.addIssue({
      code: "custom",
      path: ["barcode"],
      message: "Use Generate to create a valid EAN-13 in-store barcode",
    });
  }

  if (
    values.barcode_source === "package" &&
    isGtinLength(values.barcode) &&
    !isValidGtin(values.barcode)
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["barcode"],
      message: "Check digit does not match — re-scan the package barcode",
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

  // A cost above the selling price is a margin the till would book as a loss on
  // every sale — almost always a typo or a cents/units slip.
  const priceCents = parseMoneyToCents(values.selling_price);
  const costCents = parseMoneyToCents(values.cost_price);
  if (priceCents !== null && costCents !== null && costCents > priceCents) {
    ctx.addIssue({
      code: "custom",
      path: ["cost_price"],
      message: "Cost price is above the selling price",
    });
  }
});

export type ProductFormValues = z.infer<typeof baseProductSchema>;
export type BarcodeSource = ProductFormValues["barcode_source"];

export const DEFAULT_PRODUCT_FORM_VALUES: ProductFormValues = {
  name: "",
  sku: "",
  barcode: "",
  barcode_source: "package",
  category: "",
  unit: "unit",
  description: "",
  selling_price: "",
  cost_price: "",
  tax_rate: "0",
  discount_percent: "",
  initial_stock: "0",
  min_stock_level: "",
  expiry_date: "",
  manufacturing_date: "",
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
  const costCents = parseMoneyToCents(values.cost_price);
  const stock = toNumber(values.initial_stock) ?? 0;

  // An opening batch is written whenever either date is filled in, since those
  // are the only two facts a batch would carry at creation time. Its number is
  // derived from the SKU: batch numbering proper belongs to goods-receiving,
  // not to first entry of the product.
  const batches: ProductBatch[] | undefined =
    values.expiry_date || values.manufacturing_date
      ? [
          {
            batch_no: `${values.sku}-B1`,
            expiry_date: optional(values.expiry_date) ?? null,
            quantity: stock,
            ...(values.manufacturing_date
              ? { manufactured_date: values.manufacturing_date }
              : {}),
            ...(costCents !== null ? { cost_cents: costCents } : {}),
          },
        ]
      : undefined;

  return {
    id,
    name: values.name,
    sku: values.sku,
    barcode: values.barcode,
    barcode_source: values.barcode_source,
    price_cents: priceCents,
    tax_rate: (toNumber(values.tax_rate) ?? 0) / 100,
    stock_quantity: stock,
    category: values.category,
    unit: values.unit,
    // Derived from the unit rather than asked for separately: choosing kg/g/l/ml
    // *is* the statement that the item is weighed, and a second control that
    // could contradict it only creates rows the till cannot price.
    is_weighted: WEIGHT_UNITS.includes(values.unit),
    ...(costCents !== null ? { cost_cents: costCents } : {}),
    ...(optional(values.description) ? { description: values.description } : {}),
    ...(toNumber(values.discount_percent) !== null
      ? { discount_percent: toNumber(values.discount_percent) as number }
      : {}),
    ...(toNumber(values.min_stock_level) !== null
      ? { min_stock_level: toNumber(values.min_stock_level) as number }
      : {}),
    ...(values.images.length > 0
      ? { images: values.images, image_url: values.images[0] }
      : {}),
    ...(batches ? { batches } : {}),
  };
}
