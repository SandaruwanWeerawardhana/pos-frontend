import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProductGrid({ products, onAdd }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No products found.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => onAdd(product)}
          disabled={product.stock_quantity <= 0}
          className="flex flex-col items-start gap-1 rounded-xl border border-zinc-200 p-3 text-left transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:hover:border-zinc-600"
        >
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {product.name}
          </span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatCents(product.price_cents)}
          </span>
          <span className="text-xs text-zinc-400">
            {product.stock_quantity} in stock
          </span>
        </button>
      ))}
    </div>
  );
}
