"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  PluginProductForm,
  type PluginFieldValues,
} from "@/components/plugin-slots/PluginProductForm";
import { useToast } from "@/components/ui/Toast";
import { addProduct } from "@/lib/db";
import { ROUTES } from "@/lib/types/routes";
import type { Product } from "@/lib/types";

function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

function toTaxRate(value: string): number {
  return Number(value) / 100;
}

export default function ProductAddPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [taxRate, setTaxRate] = useState("8");
  const [stockQuantity, setStockQuantity] = useState("0");
  const [pluginValues, setPluginValues] = useState<PluginFieldValues>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    const product: Product = {
      id: crypto.randomUUID(),
      name: name.trim(),
      sku: sku.trim(),
      barcode: barcode.trim(),
      price_cents: toCents(price),
      tax_rate: toTaxRate(taxRate),
      stock_quantity: Number(stockQuantity),
    };

    if (!product.name || !product.sku || !product.barcode) {
      showToast("Name, SKU, and barcode are required", "error");
      return;
    }

    if (
      Number.isNaN(product.price_cents) ||
      product.price_cents < 0 ||
      Number.isNaN(product.tax_rate) ||
      product.tax_rate < 0 ||
      Number.isNaN(product.stock_quantity) ||
      product.stock_quantity < 0
    ) {
      showToast("Price, tax, and stock must be valid positive numbers", "error");
      return;
    }

    setSaving(true);
    try {
      await addProduct(product);
      showToast("Product added", "success");
      router.push(ROUTES.products);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Failed to add product",
        "error",
      );
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary dark:text-blue-400">
            Product management
          </p>
          <h1 className="mt-1 text-lg font-semibold text-on-surface dark:text-zinc-50">
            Add product
          </h1>
        </div>
        <Link
          href={ROUTES.products}
          className="inline-flex items-center gap-2 text-sm font-medium text-on-surface-variant hover:underline dark:text-zinc-400"
        >
          <ArrowLeft size={16} />
          Back to products
        </Link>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Product name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
          <Input
            label="SKU"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            required
          />
          <Input
            label="Barcode"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            required
          />
          <Input
            label="Price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
          <Input
            label="Tax rate (%)"
            type="number"
            min="0"
            step="0.01"
            value={taxRate}
            onChange={(event) => setTaxRate(event.target.value)}
            required
          />
          <Input
            label="Stock quantity"
            type="number"
            min="0"
            step="1"
            value={stockQuantity}
            onChange={(event) => setStockQuantity(event.target.value)}
            required
          />
        </div>

        <div className="mt-4">
          <PluginProductForm
            values={pluginValues}
            onChange={(key, value) =>
              setPluginValues((current) => ({ ...current, [key]: value }))
            }
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Link
            href={ROUTES.products}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-surface-container px-5 py-2 text-sm font-medium text-on-surface transition-all hover:scale-[1.02] hover:bg-surface-container-high dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
          >
            Cancel
          </Link>
          <Button type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? "Saving..." : "Save product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
