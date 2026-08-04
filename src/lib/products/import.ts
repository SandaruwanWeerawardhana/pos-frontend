/*
 * Maps a spreadsheet grid (see workbook.ts) onto product records.
 *
 * Nothing is written here: `prepareImport` returns the products it would add
 * plus one error per rejected row, so the screen can report both before a
 * single row reaches Dexie.
 */

import type { Product, ProductType, ProductUnit } from "@/lib/types";
import { parseMoneyToCents } from "@/lib/format";

export type ImportColumnKey =
  | "name"
  | "code"
  | "cost"
  | "category"
  | "sub_category"
  | "unit"
  | "retail_price"
  | "wholesale_price"
  | "min_price"
  | "brand"
  | "stock_alert"
  | "note";

export interface ImportColumn {
  key: ImportColumnKey;
  label: string;
  required: boolean;
  /** Shown under the column chips on the import screen. */
  hint?: string;
}

interface ImportColumnDefinition extends ImportColumn {
  /**
   * Header spellings people actually type, compared after lowercasing and
   * collapsing punctuation to underscores, so "Retail Price" and
   * "retail-price" both land on `retail_price`.
   */
  aliases: string[];
}

const COLUMN_DEFINITIONS: ImportColumnDefinition[] = [
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

export const IMPORT_COLUMNS: ImportColumn[] = COLUMN_DEFINITIONS.map(
  ({ aliases: _aliases, ...column }) => column,
);

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

type ColumnPositions = Partial<Record<ImportColumnKey, number>>;

interface RowValues {
  name: string;
  code: string;
  category: string;
  subCategory: string;
  unit: string;
  brand: string;
  note: string;
  priceCents: number | null;
  costCents: number | null;
  wholesaleCents: number | null;
  minPriceCents: number | null;
  stockAlert: number | null;
}

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mapHeaders(headerRow: string[]): {
  positions: ColumnPositions;
  unknownColumns: string[];
} {
  const positions: ColumnPositions = {};
  const unknownColumns: string[] = [];

  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;

    const match = COLUMN_DEFINITIONS.find((column) =>
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

function parseQuantity(value: string): number | null {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function readRow(row: string[], positions: ColumnPositions): RowValues {
  function cell(key: ImportColumnKey): string {
    const index = positions[key];
    return index === undefined ? "" : (row[index] ?? "").trim();
  }

  return {
    name: cell("name"),
    code: cell("code"),
    category: cell("category"),
    subCategory: cell("sub_category"),
    unit: cell("unit"),
    brand: cell("brand"),
    note: cell("note"),
    priceCents: parseMoneyToCents(cell("retail_price")),
    costCents: parseMoneyToCents(cell("cost")),
    wholesaleCents: parseMoneyToCents(cell("wholesale_price")),
    minPriceCents: parseMoneyToCents(cell("min_price")),
    stockAlert: parseQuantity(cell("stock_alert")),
  };
}

function validateRow(
  values: RowValues,
  units: Set<string>,
  seenCodes: Set<string>,
  existingCodes: Set<string>,
): string[] {
  const problems: string[] = [];
  const code = values.code.toLowerCase();

  if (!values.name) problems.push("name is required");
  if (!values.code) problems.push("code is required");
  if (!values.category) problems.push("category is required");
  if (values.priceCents === null) problems.push("Retail price is not a number");
  if (values.costCents === null) problems.push("cost is not a number");

  if (!values.unit) {
    problems.push("unit is required");
  } else if (units.size > 0 && !units.has(values.unit.toLowerCase())) {
    problems.push(`unit "${values.unit}" does not exist yet`);
  }

  if (code && seenCodes.has(code)) {
    problems.push(`code "${values.code}" appears twice in this file`);
  }
  if (code && existingCodes.has(code)) {
    problems.push(`code "${values.code}" already exists in the catalogue`);
  }

  return problems;
}

function buildProduct(
  values: RowValues,
  priceCents: number,
  costCents: number,
  productType: ProductType,
): Product {
  return {
    id: crypto.randomUUID(),
    name: values.name,
    sku: values.code,
    barcode: values.code,
    barcode_symbology: "CODE128",
    barcode_source: "generated",
    price_cents: priceCents,
    cost_cents: costCents,
    tax_rate: 0,
    stock_quantity: 0,
    category: values.category,
    subcategory: values.subCategory || undefined,
    unit: values.unit as ProductUnit,
    wholesale_price_cents: values.wholesaleCents ?? undefined,
    min_price_cents: values.minPriceCents ?? undefined,
    brand: values.brand || undefined,
    reorder_level: values.stockAlert ?? undefined,
    description: values.note || undefined,
    product_type: productType,
    is_active: true,
  };
}

function missingRequiredColumns(positions: ColumnPositions): string[] {
  return COLUMN_DEFINITIONS.filter(
    (column) => column.required && positions[column.key] === undefined,
  ).map((column) => column.label);
}

/**
 * Turns a parsed grid into products ready for `addProduct`.
 *
 * A row is rejected whole — a product with a missing price or an unknown unit
 * would sell wrong at the till, so it never reaches the catalogue.
 */
export function prepareImport(
  grid: string[][],
  options: PrepareImportOptions,
): ImportPreparation {
  if (grid.length === 0) {
    return {
      products: [],
      errors: [{ row: 1, message: "The file is empty" }],
      unknownColumns: [],
    };
  }

  const { positions, unknownColumns } = mapHeaders(grid[0]);
  const missing = missingRequiredColumns(positions);

  if (missing.length > 0) {
    return {
      products: [],
      unknownColumns,
      errors: [
        {
          row: 1,
          message: `Missing required column(s): ${missing.join(", ")}`,
        },
      ],
    };
  }

  const products: Product[] = [];
  const errors: ImportRowError[] = [];
  const seenCodes = new Set<string>();
  const units = new Set(options.allowedUnits.map((unit) => unit.toLowerCase()));

  grid.slice(1).forEach((row, offset) => {
    if (row.every((value) => value.trim() === "")) return;

    const values = readRow(row, positions);
    const problems = validateRow(
      values,
      units,
      seenCodes,
      options.existingCodes,
    );

    if (problems.length > 0 || values.priceCents === null || values.costCents === null) {
      errors.push({ row: offset + 2, message: problems.join("; ") });
      return;
    }

    seenCodes.add(values.code.toLowerCase());
    products.push(
      buildProduct(
        values,
        values.priceCents,
        values.costCents,
        options.productType,
      ),
    );
  });

  return { products, errors, unknownColumns };
}

/** Rows for the downloadable example file, header included. */
export const IMPORT_EXAMPLE_ROWS: string[][] = [
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
