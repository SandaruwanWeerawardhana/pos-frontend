/*
 * Maps a spreadsheet grid (see workbook.ts) onto price edits for products the
 * catalogue already holds.
 *
 * This is deliberately not `prepareImport` with a flag: the update sheet is
 * three columns wide, creates nothing, and treats an unknown code as a skip
 * rather than an error — a shop exports its whole catalogue, edits a handful
 * of prices, and re-imports the lot, so rows that match nothing are normal.
 *
 * Nothing is written here. `prepareUpdateImport` returns the edits it would
 * apply plus one entry per rejected or skipped row, so the screen can report
 * all three outcomes before a single row reaches Dexie.
 */

import type { Product } from "@/lib/types";
import { parseMoneyToCents } from "@/lib/format";
import type { ImportColumn, ImportRowError } from "@/lib/products/import";
import { normalizeHeader } from "@/lib/products/import";

/** One product edit, resolved against the catalogue. */
export interface UpdateImportRow {
  /** 1-based row number as the spreadsheet shows it, header included. */
  row: number;
  productId: string;
  productName: string;
  code: string;
  costCents: number;
  priceCents: number;
}

/** A row whose code matches nothing in the catalogue. */
export interface UpdateImportSkip {
  row: number;
  code: string;
}

export interface UpdateImportPreparation {
  updates: UpdateImportRow[];
  errors: ImportRowError[];
  skipped: UpdateImportSkip[];
  /** Headers the file carried that nothing here understands. */
  unknownColumns: string[];
}

export interface PrepareUpdateImportOptions {
  /**
   * Every product the update may touch. Codes are matched against both `sku`
   * and `barcode`, lowercased, because either is what a shop calls "the code".
   */
  products: Product[];
}

interface UpdateColumnDefinition extends ImportColumn {
  aliases: string[];
}

const UPDATE_COLUMN_DEFINITIONS: UpdateColumnDefinition[] = [
  {
    key: "code",
    label: "code",
    required: true,
    hint: "Must match an existing product code exactly.",
    aliases: ["code", "barcode", "sku", "product_code", "variant_code"],
  },
  {
    key: "cost",
    label: "cost",
    required: true,
    hint: "Product cost (numeric value).",
    aliases: ["cost", "cost_price", "purchase_price"],
  },
  {
    key: "retail_price",
    label: "retail_price",
    required: true,
    hint: "Product retail/selling price (numeric value).",
    aliases: ["retail_price", "price", "selling_price", "sale_price"],
  },
];

export const UPDATE_IMPORT_COLUMNS: ImportColumn[] =
  UPDATE_COLUMN_DEFINITIONS.map((definition) => ({
    key: definition.key,
    label: definition.label,
    required: definition.required,
    hint: definition.hint,
  }));

/** Rows for the downloadable example file, header included. */
export const UPDATE_IMPORT_EXAMPLE_ROWS: string[][] = [
  ["code", "cost", "retail_price"],
  ["PROD-001", "10.50", "19.99"],
  ["PROD-002", "5.25", "12.50"],
  ["PROD-003", "8.00", "15.00"],
];

type ColumnPositions = Record<string, number | undefined>;

function mapHeaders(headerRow: string[]): {
  positions: ColumnPositions;
  unknownColumns: string[];
} {
  const positions: ColumnPositions = {};
  const unknownColumns: string[] = [];

  headerRow.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;

    const match = UPDATE_COLUMN_DEFINITIONS.find((column) =>
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

function cellAt(
  row: string[],
  positions: ColumnPositions,
  key: string,
): string {
  const index = positions[key];
  return index === undefined ? "" : (row[index] ?? "").trim();
}

/** Both `sku` and `barcode` resolve to the same product. */
export function indexProductsByCode(
  products: Product[],
): Map<string, Product> {
  const byCode = new Map<string, Product>();
  for (const product of products) {
    const sku = product.sku?.trim().toLowerCase();
    const barcode = product.barcode?.trim().toLowerCase();
    if (sku && !byCode.has(sku)) byCode.set(sku, product);
    if (barcode && !byCode.has(barcode)) byCode.set(barcode, product);
  }
  return byCode;
}

/**
 * Turns a parsed grid into cost/price edits ready for `updateProduct`.
 *
 * A row with an unreadable number is rejected whole — half an edit would put a
 * price on the shelf that the cost no longer justifies. A row whose code is
 * unknown is skipped, not rejected: it is the expected shape of a partial
 * price list, and reporting it as an error would bury the real problems.
 */
export function prepareUpdateImport(
  grid: string[][],
  options: PrepareUpdateImportOptions,
): UpdateImportPreparation {
  if (grid.length === 0) {
    return {
      updates: [],
      errors: [{ row: 1, message: "The file is empty" }],
      skipped: [],
      unknownColumns: [],
    };
  }

  const { positions, unknownColumns } = mapHeaders(grid[0]);
  const missing = UPDATE_COLUMN_DEFINITIONS.filter(
    (column) => positions[column.key] === undefined,
  ).map((column) => column.label);

  if (missing.length > 0) {
    return {
      updates: [],
      skipped: [],
      unknownColumns,
      errors: [
        { row: 1, message: `Missing required column(s): ${missing.join(", ")}` },
      ],
    };
  }

  const byCode = indexProductsByCode(options.products);
  const updates: UpdateImportRow[] = [];
  const errors: ImportRowError[] = [];
  const skipped: UpdateImportSkip[] = [];
  const seenCodes = new Set<string>();

  grid.slice(1).forEach((row, offset) => {
    if (row.every((value) => value.trim() === "")) return;

    const rowNumber = offset + 2;
    const code = cellAt(row, positions, "code");
    const costCents = parseMoneyToCents(cellAt(row, positions, "cost"));
    const priceCents = parseMoneyToCents(cellAt(row, positions, "retail_price"));

    const problems: string[] = [];
    const lowerCode = code.toLowerCase();
    if (!code) problems.push("code is required");
    if (costCents === null) {
      problems.push("cost is not a number");
    } else if (costCents < 0) {
      problems.push("cost cannot be negative");
    }
    if (priceCents === null) {
      problems.push("retail_price is not a number");
    } else if (priceCents < 0) {
      problems.push("retail_price cannot be negative");
    }
    if (lowerCode && seenCodes.has(lowerCode)) {
      problems.push(`code "${code}" appears twice in this file`);
    }

    if (problems.length > 0 || costCents === null || priceCents === null) {
      errors.push({ row: rowNumber, message: problems.join("; ") });
      return;
    }

    seenCodes.add(lowerCode);

    const product = byCode.get(lowerCode);
    if (!product) {
      skipped.push({ row: rowNumber, code });
      return;
    }

    updates.push({
      row: rowNumber,
      productId: product.id,
      productName: product.name,
      code,
      costCents,
      priceCents,
    });
  });

  return { updates, errors, skipped, unknownColumns };
}
