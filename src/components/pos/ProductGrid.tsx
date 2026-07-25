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
      <span className="inline-flex items-center gap-1 text-xs font-medium text-error dark:text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-error" />
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
    <span className="inline-flex items-center gap-1 text-xs font-medium text-on-tertiary-container dark:text-emerald-400">
      <span className="h-1.5 w-1.5 rounded-full bg-on-tertiary-container" />
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
    <div className="group relative flex flex-col rounded-2xl border border-outline-variant bg-surface-container-lowest p-3 transition-shadow hover:shadow-elevated dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex aspect-square items-center justify-center rounded-xl bg-surface-container text-3xl font-semibold text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-600">
        {product.name.charAt(0).toUpperCase()}
      </div>

      <p className="line-clamp-1 text-sm font-semibold text-on-surface dark:text-zinc-50">
        {product.name}
      </p>
      <p className="mt-0.5 text-mono-label text-on-surface-variant">
        {product.barcode || product.sku}
      </p>

      <p className="mt-2 text-lg font-bold text-on-surface dark:text-zinc-50">
        {formatCents(product.price_cents)}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <StockBadge quantity={product.stock_quantity} />
        <button
          type="button"
          onClick={() => onAdd(product)}
          disabled={disabled}
          aria-label={`Add ${product.name} to cart`}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-on-secondary transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
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
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-outline-variant py-16 dark:border-zinc-800">
        <p className="text-center text-sm text-on-surface-variant dark:text-zinc-400">
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
