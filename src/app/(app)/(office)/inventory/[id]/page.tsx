"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PluginInventoryPanel } from "@/components/plugin-slots/PluginInventoryPanel";
import { ROUTES } from "@/lib/types/routes";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type ProductDetailPageProps = Readonly<{
  params: Promise<{ id: string }>;
}>;

export default function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = use(params);
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    db.products.get(id).then((found) => setProduct(found ?? null));
  }, [id]);

  if (product === undefined) {
    return <p className="text-sm text-on-surface-variant dark:text-zinc-400">Loading…</p>;
  }

  if (product === null) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-on-surface-variant dark:text-zinc-400">
          Product not found in the local catalog.
        </p>
        <Link href={ROUTES.inventory.root} className="text-sm hover:underline">
          Back to inventory
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
            {product.name}
          </h1>
          <p className="text-sm text-on-surface-variant dark:text-zinc-400">
            SKU {product.sku} · Barcode {product.barcode}
          </p>
        </div>
        <Badge variant={product.stock_quantity <= 5 ? "warning" : "neutral"}>
          {product.stock_quantity} in stock
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-2xl border border-outline-variant p-4 text-sm dark:border-zinc-800">
        <div>
          <p className="text-on-surface-variant dark:text-zinc-400">Price</p>
          <p className="text-base font-medium text-on-surface dark:text-zinc-50">
            {formatCents(product.price_cents)}
          </p>
        </div>
        <div>
          <p className="text-on-surface-variant dark:text-zinc-400">Tax rate</p>
          <p className="text-base font-medium text-on-surface dark:text-zinc-50">
            {(product.tax_rate * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <PluginInventoryPanel product={product} />

      <div>
        <Button type="button" variant="secondary" disabled title="Editing requires the backend product-management endpoint, which doesn't exist yet">
          Edit product (not implemented — backend pending)
        </Button>
        <p className="mt-2 text-xs text-on-surface-variant">
          Products are a read-only cache pulled from the server. Local edits
          aren&apos;t possible until a backend product-management endpoint
          exists — otherwise the next sync would silently overwrite them.
        </p>
      </div>
    </div>
  );
}
