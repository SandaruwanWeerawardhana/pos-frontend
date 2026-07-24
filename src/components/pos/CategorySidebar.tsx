"use client";

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
  return (
    <aside
      suppressHydrationWarning
      className="hidden w-56 shrink-0 flex-col gap-1 rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900 xl:flex"
    >
      <CategoryRow
        label="All Products"
        count={totalCount}
        active={active === "all"}
        onClick={() => onSelect("all")}
      />
      <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
      {CATEGORIES.map((category) => (
        <CategoryRow
          key={category}
          label={category}
          active={active === category}
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
  onClick,
}: Readonly<{
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-blue-600 text-white"
          : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`text-xs tabular-nums ${active ? "text-blue-100" : "text-zinc-400"}`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
