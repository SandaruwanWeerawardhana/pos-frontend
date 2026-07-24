"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { searchProducts } from "@/lib/db";
import type { Product } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/lib/types/routes";

const LOW_STOCK_THRESHOLD = 5;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchProducts(query).then(setProducts);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  const columns: TableColumn<Product>[] = [
    {
      key: "name",
      header: "Name",
      render: (product) => (
        <Link
          href={ROUTES.inventory.detail(product.id)}
          className="hover:underline"
        >
          {product.name}
        </Link>
      ),
    },
    { key: "sku", header: "SKU", render: (product) => product.sku },
    {
      key: "price",
      header: "Price",
      render: (product) => formatCents(product.price_cents),
    },
    {
      key: "stock",
      header: "Stock",
      render: (product) => (
        <Badge
          variant={
            product.stock_quantity <= LOW_STOCK_THRESHOLD ? "warning" : "neutral"
          }
        >
          {product.stock_quantity}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Inventory
        </h1>
        <Link href={ROUTES.inventory.new}>
          <Button size="sm">Add product</Button>
        </Link>
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search products…"
      />
      <Table
        columns={columns}
        rows={products}
        rowKey={(product) => product.id}
        emptyMessage="No products in the local catalog."
      />
    </div>
  );
}
