"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  FileSpreadsheet,
  Info,
  Layers,
  Power,
  Store,
  Upload,
  UploadCloud,
  Wrench,
} from "lucide-react";
import { addProduct, listProductUnits, searchProducts } from "@/lib/db";
import type { ProductType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { exportExcel, type ExportColumn } from "@/lib/export";
import { PRODUCT_UNIT_OPTIONS } from "@/lib/products/constants";
import {
  getImportColumns,
  getImportExampleRows,
  prepareImport,
  type ImportRowError,
} from "@/lib/products/import";
import { readWorkbook } from "@/lib/products/workbook";
import { ROUTES } from "@/lib/types/routes";

const STRONG_TEXT_CLASSES = "text-on-surface dark:text-zinc-100";
const CARD_TITLE_CLASSES = `text-sm font-semibold ${STRONG_TEXT_CLASSES}`;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

const TABS: { value: ProductType; label: string; icon: typeof Store }[] = [
  { value: "standard", label: "Single Products", icon: Store },
  { value: "variable", label: "Variant Products", icon: Layers },
  { value: "service", label: "Service Products", icon: Wrench },
];

interface ImportResult {
  added: number;
  errors: ImportRowError[];
  unknownColumns: string[];
}

const FORMAT_NOTES: Record<ProductType, { intro: string; rules: string[] }> = {
  standard: {
    intro: "Create one row per product.",
    rules: [
      "code must be unique across products and variants.",
      "unit must already exist (use its short name if available).",
      "category will be created automatically if missing.",
      "sub_category is optional. Will be created under its category if missing.",
    ],
  },
  variable: {
    intro:
      "Create one row per variant. Repeat the product columns for each variant of the same product_code.",
    rules: [
      "product_code Parent product code used to group variants.",
      "variant_code must be unique globally (cannot match any product or variant code).",
      "unit must already exist (use its short name if available).",
      "category will be created automatically if missing.",
      "sub_category is optional. Will be created under its category if missing.",
    ],
  },
  service: {
    intro: "Create one row per service.",
    rules: [
      "code must be unique across products and variants.",
      "unit must already exist (use its short name if available).",
      "category will be created automatically if missing.",
      "sub_category is optional. Will be created under its category if missing.",
    ],
  },
  combo: {
    intro: "Create one row per product.",
    rules: [
      "code must be unique across products and variants.",
      "unit must already exist (use its short name if available).",
      "category will be created automatically if missing.",
      "sub_category is optional. Will be created under its category if missing.",
    ],
  },
};

/** First word of each rule string is the bold term; the rest is the sentence. */
function splitRule(rule: string): [string, string] {
  const spaceIndex = rule.indexOf(" ");
  return [rule.slice(0, spaceIndex), rule.slice(spaceIndex + 1)];
}

function ColumnChip({
  label,
  required,
}: Readonly<{ label: string; required: boolean }>) {
  const tone = required
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-outline-variant bg-surface-container-low text-on-surface-variant dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400";

  return (
    <span
      className={`flex min-h-11 items-center rounded-xl border px-4 text-sm font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

export default function ImportProductsPage() {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [productType, setProductType] = useState<ProductType>("standard");
  const [fileName, setFileName] = useState("");
  const [grid, setGrid] = useState<string[][]>([]);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importColumns = getImportColumns(productType);
  const importExampleRows = getImportExampleRows(productType);
  const formatNotes = FORMAT_NOTES[productType];
  const requiredLabels = new Set(
    importColumns.filter((column) => column.required).map(
      (column) => column.label,
    ),
  );

  async function ingest(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
      showToast("Use an XLSX, XLS or CSV file", "error");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showToast("File is larger than 20 MB", "error");
      return;
    }

    setReading(true);
    setResult(null);
    try {
      const rows = await readWorkbook(file);
      setGrid(rows);
      setFileName(file.name);
      showToast(`${file.name}: ${Math.max(0, rows.length - 1)} rows read`, "info");
    } catch (error) {
      setGrid([]);
      setFileName("");
      showToast(
        error instanceof Error ? error.message : "Could not read the file",
        "error",
      );
    } finally {
      setReading(false);
    }
  }

  async function importNow() {
    if (grid.length === 0) {
      showToast("Choose a file first", "warning");
      return;
    }

    setImporting(true);
    try {
      const [products, unitRecords] = await Promise.all([
        searchProducts(""),
        listProductUnits(),
      ]);

      const existingCodes = new Set<string>();
      for (const product of products) {
        existingCodes.add(product.sku.toLowerCase());
        existingCodes.add(product.barcode.toLowerCase());
      }

      const allowedUnits = [
        ...PRODUCT_UNIT_OPTIONS.map((option) => option.value),
        ...unitRecords.map((record) => record.short_name),
      ];

      const prepared = prepareImport(grid, {
        productType,
        allowedUnits,
        existingCodes,
      });

      const errors = [...prepared.errors];
      let added = 0;

      /*
       * One insert per product rather than a bulk put: `addProduct` is what
       * enforces the SKU and barcode uniqueness the till depends on, and a
       * single bad row must not take the rest of the file down with it.
       */
      for (const product of prepared.products) {
        try {
          await addProduct(product);
          added += 1;
        } catch (error) {
          errors.push({
            row: 0,
            message: `${product.name}: ${
              error instanceof Error ? error.message : "could not be saved"
            }`,
          });
        }
      }

      setResult({ added, errors, unknownColumns: prepared.unknownColumns });
      const productLabel = added === 1 ? "product" : "products";
      showToast(
        added > 0
          ? `Imported ${added} ${productLabel}`
          : "Nothing imported — check the errors below",
        added > 0 ? "success" : "warning",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Import failed",
        "error",
      );
    } finally {
      setImporting(false);
    }
  }

  function downloadExample() {
    const [header, ...rows] = importExampleRows;
    const columns: ExportColumn<string[]>[] = header.map((label, index) => ({
      key: label,
      header: label,
      value: (row) => row[index] ?? "",
    }));
    exportExcel(
      `product-import-example-${productType}`,
      "Product import example",
      rows,
      columns,
    );
  }

  function reset() {
    setGrid([]);
    setFileName("");
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    ingest(event.dataTransfer.files);
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-sky-50/70 p-5 dark:bg-zinc-900">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
            <UploadCloud size={22} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface dark:text-zinc-50">
              Import Products
            </h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400">
              Bulk add items from an Excel file.
            </p>
          </div>
        </div>
        <Link
          href={ROUTES.products}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          <ChevronLeft size={16} aria-hidden />
          Back to list
        </Link>
      </section>

      <div className="flex justify-center">
        <div
          role="tablist"
          aria-label="Product kind"
          className="flex overflow-hidden rounded-lg border border-outline-variant dark:border-zinc-800"
        >
          {TABS.map((tab) => {
            const active = productType === tab.value;
            const Icon = tab.icon;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setProductType(tab.value);
                  reset();
                }}
                className={`inline-flex min-h-11 items-center gap-2 px-4 text-sm font-medium transition-colors ${
                  active
                    ? "bg-secondary text-on-secondary dark:bg-white dark:text-zinc-900"
                    : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                <Icon size={16} aria-hidden />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragging
            ? "border-secondary bg-surface-container"
            : "border-outline-variant hover:bg-surface-container-low dark:border-zinc-700 dark:hover:bg-zinc-900"
        }`}
      >
        <Download size={22} className="text-secondary dark:text-blue-400" aria-hidden />
        <span className="text-lg font-semibold text-on-surface dark:text-zinc-50">
          {reading ? "Reading file…" : "Click or drop your Excel file here"}
        </span>
        <span className="text-xs text-on-surface-variant dark:text-zinc-400">
          Allowed formats: XLSX, XLS, CSV · Max size: 20MB
        </span>
        {fileName && (
          <span className="mt-2 inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1 text-xs font-medium text-on-surface dark:bg-zinc-800 dark:text-zinc-100">
            <FileSpreadsheet size={13} aria-hidden />
            {fileName} · {Math.max(0, grid.length - 1)} rows
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(event) => ingest(event.target.files)}
      />

      <Card>
        <h2 className={`flex items-center gap-2 ${CARD_TITLE_CLASSES}`}>
          <Info size={16} aria-hidden />
          Example format
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant dark:text-zinc-400">
          {formatNotes.intro} Columns in{" "}
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            green
          </span>{" "}
          are required.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                {importExampleRows[0].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className={`whitespace-nowrap px-3 py-2.5 font-semibold ${
                      requiredLabels.has(header)
                        ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-surface-container-low text-on-surface dark:bg-zinc-900 dark:text-zinc-100"
                    }`}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50 dark:divide-zinc-800">
              {importExampleRows.slice(1).map((row, rowIndex) => (
                <tr key={`${productType}-${rowIndex}`}>
                  {row.map((value, index) => (
                    <td
                      key={importExampleRows[0][index]}
                      className="px-3 py-2.5 text-on-surface dark:text-zinc-100"
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-4 flex list-disc flex-col gap-1.5 pl-5 text-sm text-on-surface-variant dark:text-zinc-400">
          {formatNotes.rules.map((rule) => {
            const [term, rest] = splitRule(rule);
            return (
              <li key={rule}>
                <b className={STRONG_TEXT_CLASSES}>{term}</b> {rest}
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={importNow} loading={importing}>
          <Upload size={16} />
          Import now
        </Button>
        <Button type="button" variant="outline" onClick={downloadExample}>
          <FileSpreadsheet size={16} />
          Download example
        </Button>
        <Button type="button" variant="outline" onClick={reset}>
          <Power size={16} />
          Reset
        </Button>
      </div>

      {result && (
        <Card>
          <h2 className={CARD_TITLE_CLASSES}>
            Import summary
          </h2>
          <p className="mt-1 text-sm text-on-surface-variant dark:text-zinc-400">
            {result.added} product{result.added === 1 ? "" : "s"} added,{" "}
            {result.errors.length} row{result.errors.length === 1 ? "" : "s"}{" "}
            rejected.
          </p>
          {result.unknownColumns.length > 0 && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              Ignored column(s): {result.unknownColumns.join(", ")}
            </p>
          )}
          {result.errors.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-error dark:text-red-400">
              {result.errors.map((error) => (
                <li key={`${error.row}-${error.message}`}>
                  {error.row > 0 ? `Row ${error.row}: ` : ""}
                  {error.message}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card>
        <h2 className={CARD_TITLE_CLASSES}>
          Required &amp; optional columns
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {importColumns.map((column) => (
            <ColumnChip
              key={column.key}
              label={column.label}
              required={column.required}
            />
          ))}
        </div>
        <ul className="mt-4 flex list-disc flex-col gap-1.5 pl-5 text-sm text-on-surface-variant dark:text-zinc-400">
          {importColumns
            .filter((column) => column.hint)
            .map((column) => (
              <li key={column.key}>
                <b className={STRONG_TEXT_CLASSES}>{column.label}</b> —{" "}
                {column.hint}
              </li>
            ))}
          <li>
            <b className={STRONG_TEXT_CLASSES}>wholesale price</b> and{" "}
            <b className={STRONG_TEXT_CLASSES}>min price</b> are optional.
          </li>
        </ul>
      </Card>

      <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-4 py-3 dark:bg-zinc-900">
        <Info size={18} className="mt-0.5 text-secondary dark:text-blue-400" aria-hidden />
        <div>
          <p className={CARD_TITLE_CLASSES}>
            Heads up
          </p>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400">
            Large files may take longer to process. Imported products start at
            zero stock — set quantities from Opening stock or a purchase.
          </p>
        </div>
      </div>
    </div>
  );
}
