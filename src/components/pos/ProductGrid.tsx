import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  onAdd: (product: Product) => void;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function StockBadge({ quantity }: Readonly<{ quantity: number }>) {
  if (quantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span>Out of Stock</span>
      </span>
    );
  }
  if (quantity <= 10) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        <span>Low Stock</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span>In Stock</span>
    </span>
  );
}

function ProductCard({
  product,
  onAdd,
}: Readonly<{ product: Product; onAdd: (product: Product) => void }>) {
  const disabled = product.stock_quantity <= 0;
  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        aria-label="Add to favorites"
        className="absolute right-3 top-3 text-zinc-300 transition-colors hover:text-amber-400 dark:text-zinc-600"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 17.3l-5.4 3 1-6-4.3-4.2 6-.9L12 4l2.7 5.2 6 .9-4.3 4.2 1 6z" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="mb-3 flex aspect-square items-center justify-center rounded-xl bg-zinc-50 text-3xl font-semibold text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600">
        {product.name.charAt(0).toUpperCase()}
      </div>

      <p className="line-clamp-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {product.name}
      </p>
      <p className="mt-0.5 text-xs tabular-nums text-zinc-400">
        {product.barcode || product.sku}
      </p>

      <p className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {formatCents(product.price_cents)}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <StockBadge quantity={product.stock_quantity} />
        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={disabled}
          aria-label={`Add ${product.name} to cart`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ProductGrid({ products, onAdd }: Readonly<ProductGridProps>) {
  if (products.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-zinc-200 py-16 dark:border-zinc-800">
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          No products found. Search to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} onAdd={onAdd} />
      ))}
    </div>
  );
}
