"use client";

import { useState } from "react";

interface CategorySidebarProps {
  totalCount: number;
  active: string;
  onSelect: (category: string) => void;
}

// Product records carry no category field yet, so this list is presentational
// until the backend exposes categories. "All Products" is the functional item.
const CATEGORIES = [
  "Beverages",
  "Snacks",
  "Bakery",
  "Frozen",
  "Vegetables",
  "Fruits",
  "Household",
  "Health",
  "Personal Care",
];

export function CategorySidebar({
  totalCount,
  active,
  onSelect,
}: Readonly<CategorySidebarProps>) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      suppressHydrationWarning
      className={`hidden shrink-0 flex-col gap-1 rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 transition-[width] duration-150 dark:border-zinc-800 dark:bg-zinc-900 xl:flex ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        aria-label={collapsed ? "Expand categories" : "Collapse categories"}
        className={`mb-1 flex items-center rounded-lg p-2 text-on-surface-variant hover:bg-surface-container dark:hover:bg-zinc-800 dark:hover:text-zinc-300 ${
          collapsed ? "justify-center" : "justify-end"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <CategoryRow
        label="All Products"
        count={totalCount}
        active={active === "all"}
        collapsed={collapsed}
        onClick={() => onSelect("all")}
      />
      <div className="my-1 border-t border-outline-variant/50 dark:border-zinc-800" />
      {CATEGORIES.map((category) => (
        <CategoryRow
          key={category}
          label={category}
          active={active === category}
          collapsed={collapsed}
          onClick={() => onSelect(category)}
        />
      ))}
    </aside>
  );
}

function CategoryRow({
  label,
  count,
  active,
  collapsed,
  onClick,
}: Readonly<{
  label: string;
  count?: number;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        collapsed ? "justify-center" : "justify-between"
      } ${
        active
          ? "bg-primary text-on-primary"
          : "text-on-surface-variant hover:bg-surface-container dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {collapsed ? (
        <span className="text-xs font-semibold uppercase">
          {label.charAt(0)}
        </span>
      ) : (
        <>
          <span>{label}</span>
          {count !== undefined && (
            <span
              className={`text-xs tabular-nums ${active ? "text-on-primary/70" : "text-on-surface-variant"}`}
            >
              {count}
            </span>
          )}
        </>
      )}
    </button>
  );
}
