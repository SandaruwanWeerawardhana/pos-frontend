"use client";

import { type FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { searchProducts, updateProductStock } from "@/lib/db";
import type { Product } from "@/lib/types";
import { Input } from "@/components/ui/Input";
import { Table, type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

const LOW_STOCK_THRESHOLD = 5;

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function InventoryPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockError, setStockError] = useState("");
  const [updatingStock, setUpdatingStock] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const timeout = setTimeout(() => {
      searchProducts(query).then(setProducts);
    }, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  function openStockUpdate(product: Product) {
    setStockProduct(product);
    setStockQuantity(String(product.stock_quantity));
    setStockError("");
  }

  function closeStockUpdate() {
    if (updatingStock) return;
    setStockProduct(null);
    setStockQuantity("");
    setStockError("");
  }

  async function handleStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextStock = Number(stockQuantity);
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      setStockError("Enter a whole stock quantity.");
      return;
    }

    if (!stockProduct) return;

    setUpdatingStock(true);
    try {
      await updateProductStock(stockProduct.id, nextStock);
      setProducts((current) =>
        current.map((product) =>
          product.id === stockProduct.id
            ? { ...product, stock_quantity: nextStock }
            : product,
        ),
      );
      showToast("Stock updated", "success");
      setStockProduct(null);
      setStockQuantity("");
      setStockError("");
    } catch {
      showToast("Failed to update stock", "error");
    } finally {
      setUpdatingStock(false);
    }
  }

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
    {
      key: "actions",
      header: "Actions",
      render: (product) => (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => openStockUpdate(product)}
        >
          <Plus size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
          Inventory
        </h1>
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
      <Modal
        open={stockProduct !== null}
        onClose={closeStockUpdate}
        title="Update stock"
      >
        <form className="flex flex-col gap-4" onSubmit={handleStockSubmit}>
          <p className="text-sm font-medium text-on-surface dark:text-zinc-50">
            {stockProduct?.name}
          </p>
          <Input
            label="Stock quantity"
            type="number"
            min={0}
            step={1}
            value={stockQuantity}
            onChange={(event) => {
              setStockQuantity(event.target.value);
              setStockError("");
            }}
            error={stockError}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={closeStockUpdate}
              disabled={updatingStock}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updatingStock}>
              {updatingStock ? "Updating..." : "Update stock"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
