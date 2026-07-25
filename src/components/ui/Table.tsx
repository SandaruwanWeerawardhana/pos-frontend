import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  emptyMessage = "No data",
}: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-on-surface-variant dark:text-zinc-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant dark:border-zinc-800">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-container-low text-on-surface-variant dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-2 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/50 dark:divide-zinc-800">
          {rows.map((row) => (
            <tr key={rowKey(row)} className="text-on-surface dark:text-zinc-50">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-2">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
