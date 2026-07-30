"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

export interface DataColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Supplying this makes the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  /** Hidden below `sm` so narrow screens keep only the essential columns. */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  caption?: string;
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

// Sorting and pagination live in the component because every list screen in
// the app needs the same behaviour over a fully-loaded local Dexie array —
// there is no server pagination to defer to.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No data",
  pageSize = 25,
  onRowClick,
  caption,
}: Readonly<DataTableProps<T>>) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);
  const captionId = useId();

  const sortColumn = sort
    ? columns.find((column) => column.key === sort.key)
    : undefined;

  const sorted =
    sortColumn?.sortValue && sort
      ? [...rows].sort((a, b) => {
          const result = compareValues(
            sortColumn.sortValue!(a),
            sortColumn.sortValue!(b),
          );
          return sort.direction === "asc" ? result : -result;
        })
      : rows;

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Filtering can shrink the list under the current page; clamp rather than
  // rendering an empty page the user has to click their way out of.
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(
    currentPage * pageSize,
    currentPage * pageSize + pageSize,
  );

  function toggleSort(column: DataColumn<T>) {
    if (!column.sortValue) return;
    setPage(0);
    setSort((current) => {
      if (current?.key !== column.key) return { key: column.key, direction: "asc" };
      if (current.direction === "asc") return { key: column.key, direction: "desc" };
      return null;
    });
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-outline-variant py-10 text-center text-sm text-on-surface-variant dark:border-zinc-800 dark:text-zinc-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-outline-variant dark:border-zinc-800">
        <table
          className="w-full text-left text-sm"
          aria-describedby={caption ? captionId : undefined}
        >
          {caption && (
            <caption id={captionId} className="sr-only">
              {caption}
            </caption>
          )}
          <thead className="bg-surface-container-low text-on-surface-variant dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key;
                let ariaSort: "ascending" | "descending" | "none" = "none";
                if (active) {
                  ariaSort =
                    sort?.direction === "asc" ? "ascending" : "descending";
                }
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={column.sortValue ? ariaSort : undefined}
                    className={`px-4 py-2.5 font-medium ${
                      column.align === "right" ? "text-right" : ""
                    } ${column.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={`inline-flex items-center gap-1 rounded transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:text-zinc-100 ${
                          column.align === "right" ? "flex-row-reverse" : ""
                        }`}
                      >
                        {column.header}
                        {active ? (
                          sort?.direction === "asc" ? (
                            <ChevronUp size={13} aria-hidden />
                          ) : (
                            <ChevronDown size={13} aria-hidden />
                          )
                        ) : (
                          <ChevronDown size={13} className="opacity-30" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50 dark:divide-zinc-800">
            {visible.map((row) => (
              <tr
                key={rowKey(row)}
                // Rows are activated with Enter/Space as well as click so the
                // whole table is usable without a pointer.
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                className={`text-on-surface transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary dark:text-zinc-50 ${
                  onRowClick
                    ? "cursor-pointer hover:bg-surface-container-low dark:hover:bg-zinc-800/60"
                    : ""
                }`}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 ${
                      column.align === "right" ? "text-right tabular-nums" : ""
                    } ${column.hideOnMobile ? "hidden sm:table-cell" : ""}`}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="flex items-center justify-between gap-3 text-sm"
        >
          <p className="text-on-surface-variant dark:text-zinc-400">
            {currentPage * pageSize + 1}–
            {Math.min((currentPage + 1) * pageSize, sorted.length)} of{" "}
            {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="Previous page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-on-surface-variant dark:text-zinc-400">
              {currentPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage >= pageCount - 1}
              aria-label="Next page"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
