/*
 * Maps a spreadsheet grid (see workbook.ts) onto product records.
 *
 * Nothing is written here: `prepareImport` returns the products it would add
 * plus one error per rejected row, so the screen can report both before a
 * single row reaches Dexie.
 *
 * Three sheet shapes are supported, one per `ProductType` tab on the import
 * screen: single products, variant products (one row per variant, grouped by
 * a shared `product_code`), and service products (no cost/stock columns).
 * Each has its own column set, example rows and row-building rules, but they
 * share header matching, quantity parsing and code-uniqueness checks.
 */

import type { Product, ProductType, ProductUnit } from "@/lib/types";
import { parseMoneyToCents } from "@/lib/format";

export interface ImportColumn {
  key: string;
  label: string;
  required: boolean;
  /** Shown under the column chips on the import screen. */
  hint?: string;
}

interface ImportColumnDefinition extends ImportColumn {
  /**
   * Header spellings people actually type, compared after lowercasing and
   * collapsing punctuation to underscores, so "Retail Price" and
   * "retail-price" both land on the same key.
   */
  aliases: string[];
}

export interface ImportRowError {
  /** 1-based row number as the spreadsheet shows it, header included. */
  row: number;
  message: string;
}

export interface ImportPreparation {
  products: Product[];
  errors: ImportRowError[];
  /** Headers the file carried that nothing here understands. */
  unknownColumns: string[];
}

export interface PrepareImportOptions {
  productType: ProductType;
  /** Short names the catalogue already knows; an unknown unit fails the row. */
  allowedUnits: string[];
  existingCodes: Set<string>;
}

type ColumnPositions = Record<string, number | undefined>;

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapHeaders(
  headerRow: string[],
  definitions: ImportColumnDefinition[],
): { positions: ColumnPositions; unknownColumns: string[] } {
  const positions: ColumnPositions = {};
  const unknownColumns: string[] = [];

  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;

    const match = definitions.find((column) =>
      column.aliases.includes(normalized),
    );

    if (!match) {
      unknownColumns.push(header.trim());
      return;
    }
    if (positions[match.key] === undefined) positions[match.key] = index;
  });

  return { positions, unknownColumns };
}

function missingRequiredColumns(
  positions: ColumnPositions,
  definitions: ImportColumnDefinition[],
): string[] {
  return definitions
    .filter((column) => column.required && positions[column.key] === undefined)
    .map((column) => column.label);
}

function parseQuantity(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function cellAt(
  row: string[],
  positions: ColumnPositions,
  key: string,
): string {
  const index = positions[key];
  return index === undefined ? "" : (row[index] ?? "").trim();
}

function emptyFileResult(): ImportPreparation {
  return {
    products: [],
    errors: [{ row: 1, message: "The file is empty" }],
    unknownColumns: [],
  };
}

// ── Single products ─────────────────────────────────────────────────────

const SINGLE_COLUMN_DEFINITIONS: ImportColumnDefinition[] = [
  {
    key: "name",
    label: "name",
    required: true,
    aliases: ["name", "product", "product_name"],
  },
  {
    key: "code",
    label: "code",
    required: true,
    hint: "Must be unique across products and variants.",
    aliases: ["code", "barcode", "sku", "product_code"],
  },
  {
    key: "retail_price",
    label: "Retail price",
    required: true,
    aliases: ["retail_price", "price", "selling_price", "sale_price"],
  },
  {
    key: "cost",
    label: "cost",
    required: true,
    aliases: ["cost", "cost_price", "purchase_price"],
  },
  {
    key: "category",
    label: "category",
    required: true,
    hint: "Will be created if missing.",
    aliases: ["category"],
  },
  {
    key: "sub_category",
    label: "sub_category",
    required: false,
    hint: "Optional. Will be created under its category if it doesn't exist.",
    aliases: ["sub_category", "subcategory"],
  },
  {
    key: "unit",
    label: "unit",
    required: true,
    hint: "Unit must already exist · Use the unit short name when possible.",
    aliases: ["unit", "uom"],
  },
  {
    key: "wholesale_price",
    label: "Wholesale price",
    required: false,
    aliases: ["wholesale_price"],
  },
  {
    key: "min_price",
    label: "Min price",
    required: false,
    aliases: ["min_price", "minimum_price", "minprice"],
  },
  { key: "brand", label: "brand", required: false, aliases: ["brand"] },
  {
    key: "stock_alert",
    label: "Stock alert",
    required: false,
    aliases: ["stock_alert", "reorder_level", "alert_quantity"],
  },
  {
    key: "note",
    label: "note",
    required: false,
    aliases: ["note", "notes", "description"],
  },
];

function prepareSingleImport(
  grid: string[][],
  options: PrepareImportOptions,
): ImportPreparation {
  const { positions, unknownColumns } = mapHeaders(
    grid[0],
    SINGLE_COLUMN_DEFINITIONS,
  );
  const missing = missingRequiredColumns(positions, SINGLE_COLUMN_DEFINITIONS);
  if (missing.length > 0) {
    return {
      products: [],
      unknownColumns,
      errors: [
        { row: 1, message: `Missing required column(s): ${missing.join(", ")}` },
      ],
    };
  }

  const products: Product[] = [];
  const errors: ImportRowError[] = [];
  const seenCodes = new Set<string>();
  const units = new Set(options.allowedUnits.map((unit) => unit.toLowerCase()));

  grid.slice(1).forEach((row, offset) => {
    if (row.every((value) => value.trim() === "")) return;

    const name = cellAt(row, positions, "name");
    const code = cellAt(row, positions, "code");
    const category = cellAt(row, positions, "category");
    const subCategory = cellAt(row, positions, "sub_category");
    const unit = cellAt(row, positions, "unit");
    const brand = cellAt(row, positions, "brand");
    const note = cellAt(row, positions, "note");
    const priceCents = parseMoneyToCents(cellAt(row, positions, "retail_price"));
    const costCents = parseMoneyToCents(cellAt(row, positions, "cost"));
    const wholesaleCents = parseMoneyToCents(
      cellAt(row, positions, "wholesale_price"),
    );
    const minPriceCents = parseMoneyToCents(cellAt(row, positions, "min_price"));
    const stockAlert = parseQuantity(cellAt(row, positions, "stock_alert"));

    const problems: string[] = [];
    const lowerCode = code.toLowerCase();
    if (!name) problems.push("name is required");
    if (!code) problems.push("code is required");
    if (!category) problems.push("category is required");
    if (priceCents === null) problems.push("Retail price is not a number");
    if (costCents === null) problems.push("cost is not a number");
    if (!unit) {
      problems.push("unit is required");
    } else if (units.size > 0 && !units.has(unit.toLowerCase())) {
      problems.push(`unit "${unit}" does not exist yet`);
    }
    if (lowerCode && seenCodes.has(lowerCode)) {
      problems.push(`code "${code}" appears twice in this file`);
    }
    if (lowerCode && options.existingCodes.has(lowerCode)) {
      problems.push(`code "${code}" already exists in the catalogue`);
    }

    if (problems.length > 0 || priceCents === null || costCents === null) {
      errors.push({ row: offset + 2, message: problems.join("; ") });
      return;
    }

    seenCodes.add(lowerCode);
    products.push({
      id: crypto.randomUUID(),
      name,
      sku: code,
      barcode: code,
      barcode_symbology: "CODE128",
      barcode_source: "generated",
      price_cents: priceCents,
      cost_cents: costCents,
      tax_rate: 0,
      stock_quantity: 0,
      category,
      subcategory: subCategory || undefined,
      unit: unit as ProductUnit,
      wholesale_price_cents: wholesaleCents ?? undefined,
      min_price_cents: minPriceCents ?? undefined,
      brand: brand || undefined,
      reorder_level: stockAlert ?? undefined,
      description: note || undefined,
      product_type: options.productType,
      is_active: true,
    });
  });

  return { products, errors, unknownColumns };
}

/** Rows for the downloadable example file, header included. */
export const SINGLE_IMPORT_EXAMPLE_ROWS: string[][] = [
  [
    "name",
    "code",
    "cost",
    "category",
    "sub_category",
    "unit",
    "Retail price",
    "Wholesale price",
    "Min price",
    "brand",
    "Stock alert",
    "note",
  ],
  [
    "Blue T-Shirt",
    "TSHIRT-BLUE",
    "8.00",
    "Apparel",
    "T-Shirts",
    "pc",
    "19.90",
    "17.00",
    "15.00",
    "Acme",
    "5",
    "Summer collection",
  ],
  [
    "Coffee Mug",
    "MUG-COF-01",
    "2.20",
    "Home",
    "Kitchen",
    "pc",
    "6.50",
    "6.00",
    "5.75",
    "",
    "0",
    "",
  ],
];

// ── Variant products ────────────────────────────────────────────────────

const VARIANT_COLUMN_DEFINITIONS: ImportColumnDefinition[] = [
  {
    key: "product_name",
    label: "product name",
    required: true,
    aliases: ["product_name", "name", "product"],
  },
  {
    key: "product_code",
    label: "product code",
    required: true,
    hint: "Parent product code used to group variants.",
    aliases: ["product_code"],
  },
  {
    key: "category",
    label: "category",
    required: true,
    hint: "Will be created automatically if missing.",
    aliases: ["category"],
  },
  {
    key: "sub_category",
    label: "sub_category",
    required: false,
    hint: "Optional. Will be created under its category if missing.",
    aliases: ["sub_category", "subcategory"],
  },
  {
    key: "unit",
    label: "unit",
    required: true,
    hint: "Must already exist (use its short name if available).",
    aliases: ["unit", "uom"],
  },
  { key: "brand", label: "brand", required: false, aliases: ["brand"] },
  {
    key: "variant_name",
    label: "variant name",
    required: true,
    aliases: ["variant_name", "variant"],
  },
  {
    key: "variant_code",
    label: "variant code",
    required: true,
    hint: "Must be unique globally (cannot match any product or variant code).",
    aliases: ["variant_code"],
  },
  {
    key: "variant_cost",
    label: "variant cost",
    required: true,
    aliases: ["variant_cost"],
  },
  {
    key: "variant_price",
    label: "variant price",
    required: true,
    aliases: ["variant_price"],
  },
  {
    key: "variant_wholesale",
    label: "variant wholesale",
    required: false,
    aliases: ["variant_wholesale", "variant_wholesale_price"],
  },
  {
    key: "variant_min_price",
    label: "variant min price",
    required: false,
    aliases: ["variant_min_price", "variant_minimum_price"],
  },
];

function prepareVariantImport(
  grid: string[][],
  options: PrepareImportOptions,
): ImportPreparation {
  const { positions, unknownColumns } = mapHeaders(
    grid[0],
    VARIANT_COLUMN_DEFINITIONS,
  );
  const missing = missingRequiredColumns(positions, VARIANT_COLUMN_DEFINITIONS);
  if (missing.length > 0) {
    return {
      products: [],
      unknownColumns,
      errors: [
        { row: 1, message: `Missing required column(s): ${missing.join(", ")}` },
      ],
    };
  }

  const products: Product[] = [];
  const errors: ImportRowError[] = [];
  const seenCodes = new Set<string>();
  const units = new Set(options.allowedUnits.map((unit) => unit.toLowerCase()));

  grid.slice(1).forEach((row, offset) => {
    if (row.every((value) => value.trim() === "")) return;

    const productName = cellAt(row, positions, "product_name");
    const productCode = cellAt(row, positions, "product_code");
    const category = cellAt(row, positions, "category");
    const subCategory = cellAt(row, positions, "sub_category");
    const unit = cellAt(row, positions, "unit");
    const brand = cellAt(row, positions, "brand");
    const variantName = cellAt(row, positions, "variant_name");
    const variantCode = cellAt(row, positions, "variant_code");
    const costCents = parseMoneyToCents(cellAt(row, positions, "variant_cost"));
    const priceCents = parseMoneyToCents(cellAt(row, positions, "variant_price"));
    const wholesaleCents = parseMoneyToCents(
      cellAt(row, positions, "variant_wholesale"),
    );
    const minPriceCents = parseMoneyToCents(
      cellAt(row, positions, "variant_min_price"),
    );

    const problems: string[] = [];
    const lowerCode = variantCode.toLowerCase();
    if (!productName) problems.push("product name is required");
    if (!productCode) problems.push("product code is required");
    if (!category) problems.push("category is required");
    if (!variantName) problems.push("variant name is required");
    if (!variantCode) problems.push("variant code is required");
    if (costCents === null) problems.push("variant cost is not a number");
    if (priceCents === null) problems.push("variant price is not a number");
    if (!unit) {
      problems.push("unit is required");
    } else if (units.size > 0 && !units.has(unit.toLowerCase())) {
      problems.push(`unit "${unit}" does not exist yet`);
    }
    if (lowerCode && seenCodes.has(lowerCode)) {
      problems.push(`variant code "${variantCode}" appears twice in this file`);
    }
    if (lowerCode && options.existingCodes.has(lowerCode)) {
      problems.push(`variant code "${variantCode}" already exists in the catalogue`);
    }

    if (problems.length > 0 || priceCents === null || costCents === null) {
      errors.push({ row: offset + 2, message: problems.join("; ") });
      return;
    }

    seenCodes.add(lowerCode);
    products.push({
      id: crypto.randomUUID(),
      name: `${productName} - ${variantName}`,
      sku: variantCode,
      barcode: variantCode,
      barcode_symbology: "CODE128",
      barcode_source: "generated",
      price_cents: priceCents,
      cost_cents: costCents,
      tax_rate: 0,
      stock_quantity: 0,
      category,
      subcategory: subCategory || undefined,
      unit: unit as ProductUnit,
      wholesale_price_cents: wholesaleCents ?? undefined,
      min_price_cents: minPriceCents ?? undefined,
      brand: brand || undefined,
      product_type: "variable",
      variant_of: productCode,
      variant_name: variantName,
      is_active: true,
    });
  });

  return { products, errors, unknownColumns };
}

export const VARIANT_IMPORT_EXAMPLE_ROWS: string[][] = [
  [
    "product name",
    "product code",
    "category",
    "sub_category",
    "unit",
    "brand",
    "variant name",
    "variant code",
    "variant cost",
    "variant price",
    "variant wholesale",
    "variant min price",
  ],
  [
    "T-Shirt",
    "TSHIRT-100",
    "Apparel",
    "T-Shirts",
    "pc",
    "Acme",
    "Small",
    "TSHIRT-100-S",
    "7.50",
    "14.90",
    "13.00",
    "12.00",
  ],
  [
    "T-Shirt",
    "TSHIRT-100",
    "Apparel",
    "T-Shirts",
    "pc",
    "Acme",
    "Medium",
    "TSHIRT-100-M",
    "7.50",
    "14.90",
    "13.00",
    "12.00",
  ],
  [
    "T-Shirt",
    "TSHIRT-100",
    "Apparel",
    "T-Shirts",
    "pc",
    "Acme",
    "Large",
    "TSHIRT-100-L",
    "7.50",
    "14.90",
    "13.00",
    "12.00",
  ],
];

// ── Service products ────────────────────────────────────────────────────

const SERVICE_COLUMN_DEFINITIONS: ImportColumnDefinition[] = [
  {
    key: "name",
    label: "name",
    required: true,
    aliases: ["name", "product", "product_name"],
  },
  {
    key: "code",
    label: "code",
    required: true,
    hint: "Must be unique across products and variants.",
    aliases: ["code", "barcode", "sku", "product_code"],
  },
  {
    key: "retail_price",
    label: "Retail price",
    required: true,
    aliases: ["retail_price", "price", "selling_price", "sale_price"],
  },
  {
    key: "category",
    label: "category",
    required: true,
    hint: "Will be created automatically if missing.",
    aliases: ["category"],
  },
  {
    key: "sub_category",
    label: "sub_category",
    required: false,
    hint: "Optional. Will be created under its category if missing.",
    aliases: ["sub_category", "subcategory"],
  },
  {
    key: "unit",
    label: "unit",
    required: true,
    hint: "Must already exist (use its short name if available).",
    aliases: ["unit", "uom"],
  },
  {
    key: "wholesale_price",
    label: "Wholesale price",
    required: false,
    aliases: ["wholesale_price"],
  },
  {
    key: "min_price",
    label: "Min price",
    required: false,
    aliases: ["min_price", "minimum_price", "minprice"],
  },
  { key: "brand", label: "brand", required: false, aliases: ["brand"] },
  {
    key: "note",
    label: "note",
    required: false,
    aliases: ["note", "notes", "description"],
  },
];

function prepareServiceImport(
  grid: string[][],
  options: PrepareImportOptions,
): ImportPreparation {
  const { positions, unknownColumns } = mapHeaders(
    grid[0],
    SERVICE_COLUMN_DEFINITIONS,
  );
  const missing = missingRequiredColumns(positions, SERVICE_COLUMN_DEFINITIONS);
  if (missing.length > 0) {
    return {
      products: [],
      unknownColumns,
      errors: [
        { row: 1, message: `Missing required column(s): ${missing.join(", ")}` },
      ],
    };
  }

  const products: Product[] = [];
  const errors: ImportRowError[] = [];
  const seenCodes = new Set<string>();
  const units = new Set(options.allowedUnits.map((unit) => unit.toLowerCase()));

  grid.slice(1).forEach((row, offset) => {
    if (row.every((value) => value.trim() === "")) return;

    const name = cellAt(row, positions, "name");
    const code = cellAt(row, positions, "code");
    const category = cellAt(row, positions, "category");
    const subCategory = cellAt(row, positions, "sub_category");
    const unit = cellAt(row, positions, "unit");
    const brand = cellAt(row, positions, "brand");
    const note = cellAt(row, positions, "note");
    const priceCents = parseMoneyToCents(cellAt(row, positions, "retail_price"));
    const wholesaleCents = parseMoneyToCents(
      cellAt(row, positions, "wholesale_price"),
    );
    const minPriceCents = parseMoneyToCents(cellAt(row, positions, "min_price"));

    const problems: string[] = [];
    const lowerCode = code.toLowerCase();
    if (!name) problems.push("name is required");
    if (!code) problems.push("code is required");
    if (!category) problems.push("category is required");
    if (priceCents === null) problems.push("Retail price is not a number");
    if (!unit) {
      problems.push("unit is required");
    } else if (units.size > 0 && !units.has(unit.toLowerCase())) {
      problems.push(`unit "${unit}" does not exist yet`);
    }
    if (lowerCode && seenCodes.has(lowerCode)) {
      problems.push(`code "${code}" appears twice in this file`);
    }
    if (lowerCode && options.existingCodes.has(lowerCode)) {
      problems.push(`code "${code}" already exists in the catalogue`);
    }

    if (problems.length > 0 || priceCents === null) {
      errors.push({ row: offset + 2, message: problems.join("; ") });
      return;
    }

    seenCodes.add(lowerCode);
    products.push({
      id: crypto.randomUUID(),
      name,
      sku: code,
      barcode: code,
      barcode_symbology: "CODE128",
      barcode_source: "generated",
      price_cents: priceCents,
      tax_rate: 0,
      stock_quantity: 0,
      category,
      subcategory: subCategory || undefined,
      unit: unit as ProductUnit,
      wholesale_price_cents: wholesaleCents ?? undefined,
      min_price_cents: minPriceCents ?? undefined,
      brand: brand || undefined,
      description: note || undefined,
      product_type: "service",
      is_active: true,
    });
  });

  return { products, errors, unknownColumns };
}

export const SERVICE_IMPORT_EXAMPLE_ROWS: string[][] = [
  [
    "name",
    "code",
    "Retail price",
    "category",
    "sub_category",
    "unit",
    "Wholesale price",
    "Min price",
    "brand",
    "note",
  ],
  [
    "Consulting Hour",
    "SRV-CONS-01",
    "120.00",
    "Services",
    "IT Consulting",
    "hr",
    "100.00",
    "90.00",
    "",
    "Professional consulting",
  ],
  [
    "Delivery Fee",
    "SRV-DEL-01",
    "15.00",
    "Services",
    "",
    "pc",
    "",
    "",
    "",
    "",
  ],
];

// ── Dispatch ─────────────────────────────────────────────────────────────

function stripAliases(definitions: ImportColumnDefinition[]): ImportColumn[] {
  return definitions.map((definition) => ({
    key: definition.key,
    label: definition.label,
    required: definition.required,
    hint: definition.hint,
  }));
}

/** Backward-compatible default export: the single-product column/example set. */
export const IMPORT_COLUMNS: ImportColumn[] = stripAliases(
  SINGLE_COLUMN_DEFINITIONS,
);
export const IMPORT_EXAMPLE_ROWS = SINGLE_IMPORT_EXAMPLE_ROWS;

export function getImportColumns(productType: ProductType): ImportColumn[] {
  const definitions =
    productType === "variable"
      ? VARIANT_COLUMN_DEFINITIONS
      : productType === "service"
        ? SERVICE_COLUMN_DEFINITIONS
        : SINGLE_COLUMN_DEFINITIONS;
  return stripAliases(definitions);
}

export function getImportExampleRows(productType: ProductType): string[][] {
  if (productType === "variable") return VARIANT_IMPORT_EXAMPLE_ROWS;
  if (productType === "service") return SERVICE_IMPORT_EXAMPLE_ROWS;
  return SINGLE_IMPORT_EXAMPLE_ROWS;
}

/**
 * Turns a parsed grid into products ready for `addProduct`.
 *
 * A row is rejected whole — a product with a missing price or an unknown unit
 * would sell wrong at the till, so it never reaches the catalogue. Which
 * columns are read, and which are required, depends on `options.productType`.
 */
export function prepareImport(
  grid: string[][],
  options: PrepareImportOptions,
): ImportPreparation {
  if (grid.length === 0) return emptyFileResult();

  if (options.productType === "variable") {
    return prepareVariantImport(grid, options);
  }
  if (options.productType === "service") {
    return prepareServiceImport(grid, options);
  }
  return prepareSingleImport(grid, options);
}
