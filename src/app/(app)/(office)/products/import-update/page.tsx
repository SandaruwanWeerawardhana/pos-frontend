"use client";

import { useRef, useState, type DragEvent } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Download,
  FileSpreadsheet,
  Info,
  Pencil,
  Power,
  Upload,
} from "lucide-react";
import { searchProducts, updateProduct } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { exportExcel, type ExportColumn } from "@/lib/export";
import type { ImportRowError } from "@/lib/products/import";
import {
  UPDATE_IMPORT_COLUMNS,
  UPDATE_IMPORT_EXAMPLE_ROWS,
  prepareUpdateImport,
  type UpdateImportSkip,
} from "@/lib/products/import-update";
import { readWorkbook } from "@/lib/products/workbook";
import { ROUTES } from "@/lib/types/routes";

const STRONG_TEXT_CLASSES = "text-on-surface dark:text-zinc-100";
const CARD_TITLE_CLASSES = `text-sm font-semibold ${STRONG_TEXT_CLASSES}`;
const CODE_CHIP_CLASSES =
  "rounded bg-surface-container px-1.5 py-0.5 font-mono text-xs text-on-surface dark:bg-zinc-800 dark:text-zinc-100";

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

interface UpdateResult {
  updated: number;
  errors: ImportRowError[];
  skipped: UpdateImportSkip[];
  unknownColumns: string[];
}

const NOTES = [
  "This import will only update cost and retail_price fields.",
  "Products are matched by their code field.",
  "If a code doesn't exist, that row will be skipped.",
  "All other product fields remain unchanged.",
  "You can use CSV or Excel format (.csv, .xlsx, .xls).",
];

export default function ImportUpdateProductsPage() {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState("");
  const [grid, setGrid] = useState<string[][]>([]);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [result, setResult] = useState<UpdateResult | null>(null);

  async function ingest(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
      showToast("Use a CSV, XLSX or XLS file", "error");
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
      showToast(
        `${file.name}: ${Math.max(0, rows.length - 1)} rows read`,
        "info",
      );
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

  async function updateNow() {
    if (grid.length === 0) {
      showToast("Choose a file first", "warning");
      return;
    }

    setUpdating(true);
    try {
      const products = await searchProducts("");
      const prepared = prepareUpdateImport(grid, { products });

      const errors = [...prepared.errors];
      let updated = 0;

      /*
       * One write per product rather than a bulk put: `updateProduct` is what
       * queues the row for the next sync, and a single failed write must not
       * take the rest of the file down with it.
       */
      for (const update of prepared.updates) {
        try {
          await updateProduct(update.productId, {
            cost_cents: update.costCents,
            price_cents: update.priceCents,
          });
          updated += 1;
        } catch (error) {
          errors.push({
            row: update.row,
            message: `${update.code}: ${
              error instanceof Error ? error.message : "could not be saved"
            }`,
          });
        }
      }

      setResult({
        updated,
        errors,
        skipped: prepared.skipped,
        unknownColumns: prepared.unknownColumns,
      });

      const productLabel = updated === 1 ? "product" : "products";
      showToast(
        updated > 0
          ? `Updated ${updated} ${productLabel}`
          : "Nothing updated — check the summary below",
        updated > 0 ? "success" : "warning",
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Update failed",
        "error",
      );
    } finally {
      setUpdating(false);
    }
  }

  function downloadExample() {
    const [header, ...rows] = UPDATE_IMPORT_EXAMPLE_ROWS;
    const columns: ExportColumn<string[]>[] = header.map((label, index) => ({
      key: label,
      header: label,
      value: (row) => row[index] ?? "",
    }));
    exportExcel(
      "product-update-example",
      "Product update example",
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
            <Pencil size={22} aria-hidden />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface dark:text-zinc-50">
              Import Products (Update Only)
            </h1>
            <p className="text-sm text-on-surface-variant dark:text-zinc-400">
              Update cost and retail price for existing products via CSV import.
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
        <Download
          size={22}
          className="text-secondary dark:text-blue-400"
          aria-hidden
        />
        <span className="text-lg font-semibold text-on-surface dark:text-zinc-50">
          {reading ? "Reading file…" : "Click or drop your CSV/Excel file here"}
        </span>
        <span className="text-xs text-on-surface-variant dark:text-zinc-400">
          Allowed formats: CSV, XLSX, XLS · Max size: 20MB
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
          File Format
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant dark:text-zinc-400">
          Your file must have exactly 3 columns:{" "}
          <span className={CODE_CHIP_CLASSES}>code</span>,{" "}
          <span className={CODE_CHIP_CLASSES}>cost</span>, and{" "}
          <span className={CODE_CHIP_CLASSES}>retail_price</span>. Products are
          matched by code.
        </p>

        <div className="mt-4 overflow-x-auto rounded-xl border border-outline-variant dark:border-zinc-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                {UPDATE_IMPORT_EXAMPLE_ROWS[0].map((header) => (
                  <th
                    key={header}
                    scope="col"
                    className="whitespace-nowrap bg-emerald-50 px-3 py-2.5 font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50 dark:divide-zinc-800">
              {UPDATE_IMPORT_EXAMPLE_ROWS.slice(1).map((row) => (
                <tr key={row[0]}>
                  {row.map((value, index) => (
                    <td
                      key={UPDATE_IMPORT_EXAMPLE_ROWS[0][index]}
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
          {UPDATE_IMPORT_COLUMNS.map((column) => (
            <li key={column.key}>
              <b className={STRONG_TEXT_CLASSES}>{column.label}</b> —{" "}
              {column.hint}
            </li>
          ))}
          <li>
            Only products with matching codes will be updated. Other fields are
            ignored.
          </li>
        </ul>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={updateNow} loading={updating}>
          <Upload size={16} />
          Update Products
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
          <h2 className={CARD_TITLE_CLASSES}>Update summary</h2>
          <p className="mt-1 text-sm text-on-surface-variant dark:text-zinc-400">
            {result.updated} product{result.updated === 1 ? "" : "s"} updated,{" "}
            {result.skipped.length} row
            {result.skipped.length === 1 ? "" : "s"} skipped,{" "}
            {result.errors.length} row{result.errors.length === 1 ? "" : "s"}{" "}
            rejected.
          </p>
          {result.unknownColumns.length > 0 && (
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
              Ignored column(s): {result.unknownColumns.join(", ")}
            </p>
          )}
          {result.skipped.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm text-amber-700 dark:text-amber-400">
              {result.skipped.map((skip) => (
                <li key={`${skip.row}-${skip.code}`}>
                  Row {skip.row}: no product with code &quot;{skip.code}&quot;
                </li>
              ))}
            </ul>
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
        <h2 className={CARD_TITLE_CLASSES}>Important Notes</h2>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-on-surface-variant dark:text-zinc-400">
          {NOTES.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </Card>

      <div className="flex items-start gap-3 rounded-xl bg-surface-container-low px-4 py-3 dark:bg-zinc-900">
        <Info
          size={18}
          className="mt-0.5 text-secondary dark:text-blue-400"
          aria-hidden
        />
        <div>
          <p className={CARD_TITLE_CLASSES}>Heads up</p>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400">
            Large files may take longer to process. Make sure your product codes
            match exactly.
          </p>
        </div>
      </div>
    </div>
  );
}
