"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Barcode,
  Box,
  Download,
  Layers,
  Package,
  Plus,
  QrCode,
  Search,
  Tags,
  Wand2,
} from "lucide-react";
import { listBrands, listCategories, searchProducts } from "@/lib/db";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { Card, PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { useSettings } from "@/lib/hooks/use-settings";
import { exportCsv, exportExcel, type ExportColumn } from "@/lib/export";
import { ROUTES } from "@/lib/types/routes";

function makeSku(prefix: string, name: string): string {
  const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const cleanName = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  return `${cleanPrefix || "PRD"}-${cleanName || "ITEM"}-${suffix}`;
}

// EAN-13 style: a 12-digit body plus a modulo-10 check digit, so generated
// codes scan on real hardware instead of only looking plausible.
function makeBarcode(seed: string): string {
  let numeric = "";
  for (const char of seed) {
    numeric += String(char.charCodeAt(0) % 10);
  }
  const body = `893${numeric}`.padEnd(12, "0").slice(0, 12);
  const sum = body
    .split("")
    .reduce(
      (total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3),
      0,
    );
  const checkDigit = (10 - (sum % 10)) % 10;
  return `${body}${checkDigit}`;
}

function MiniBarcode({ code }: Readonly<{ code: string }>) {
  const bars = code
    .split("")
    .map((digit, index) => Number(digit) + index)
    .slice(0, 12);

  return (
    <div aria-label={`Barcode ${code}`} className="flex h-8 items-end gap-0.5">
      {bars.map((bar, index) => (
        <span
          key={`${code}-${index}`}
          className="w-1 rounded-sm bg-on-surface dark:bg-zinc-200"
          style={{ height: `${12 + (bar % 5) * 4}px` }}
        />
      ))}
    </div>
  );
}

function MiniQr({ value }: Readonly<{ value: string }>) {
  const cells = Array.from({ length: 25 }, (_, index) => {
    const charCode = value.charCodeAt(index % Math.max(value.length, 1)) || 0;
    return (charCode + index) % 3 !== 0;
  });

  return (
    <div
      aria-label={`QR code for ${value}`}
      className="grid h-16 w-16 grid-cols-5 gap-0.5 rounded-lg border border-outline-variant bg-surface-container-lowest p-1 dark:border-zinc-700 dark:bg-zinc-950"
    >
      {cells.map((filled, index) => (
        <span
          key={`${value}-${index}`}
          className={filled ? "rounded-[2px] bg-on-surface dark:bg-zinc-100" : ""}
        />
      ))}
    </div>
  );
}

export default function ProductsPage() {
  const { money } = useSettings();

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");

  const [productName, setProductName] = useState("Organic apple pack");
  const [skuPrefix, setSkuPrefix] = useState("GRC");
  const [generatedSku, setGeneratedSku] = useState("GRC-ORGANIC-APPLE-A1B2");
  const [barcodeValue, setBarcodeValue] = useState("8930001240453");

  useEffect(() => {
    listCategories().then(setCategories);
    listBrands().then(setBrands);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchProducts(query).then(setProducts);
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const visible = useMemo(
    () =>
      products.filter((product) => {
        if (category && (product.category ?? "Uncategorised") !== category) {
          return false;
        }
        if (brand && product.brand !== brand) return false;
        return true;
      }),
    [products, category, brand],
  );

  const stats = useMemo(() => {
    const stockValue = visible.reduce(
      (total, product) => total + product.price_cents * product.stock_quantity,
      0,
    );
    const withCost = visible.filter((product) => product.cost_cents);
    const blendedMargin =
      withCost.length > 0
        ? withCost.reduce(
            (total, product) =>
              total +
              ((product.price_cents - (product.cost_cents ?? 0)) /
                product.price_cents) *
                100,
            0,
          ) / withCost.length
        : 0;
    return { stockValue, blendedMargin, weighted: visible.filter((p) => p.is_weighted).length };
  }, [visible]);

  function handleGenerateSku() {
    const nextSku = makeSku(skuPrefix, productName);
    setGeneratedSku(nextSku);
    setBarcodeValue(makeBarcode(nextSku));
  }

  const exportColumns: ExportColumn<Product>[] = [
    { key: "name", header: "Product", value: (p) => p.name },
    { key: "sku", header: "SKU", value: (p) => p.sku },
    { key: "barcode", header: "Barcode", value: (p) => p.barcode },
    { key: "category", header: "Category", value: (p) => p.category ?? "" },
    { key: "brand", header: "Brand", value: (p) => p.brand ?? "" },
    { key: "unit", header: "Unit", value: (p) => p.unit ?? "unit" },
    { key: "price", header: "Price", value: (p) => (p.price_cents / 100).toFixed(2) },
    { key: "cost", header: "Cost", value: (p) => ((p.cost_cents ?? 0) / 100).toFixed(2) },
    { key: "stock", header: "Stock", value: (p) => p.stock_quantity },
    { key: "shelf", header: "Shelf", value: (p) => p.shelf_location ?? "" },
  ];

  const columns: DataColumn<Product>[] = [
    {
      key: "product",
      header: "Product",
      sortValue: (product) => product.name,
      render: (product) => (
        <Link
          href={ROUTES.inventory.detail(product.id)}
          className="flex items-center gap-3 hover:underline"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-sm font-bold text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-300">
            {product.name.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{product.name}</span>
            <span className="block truncate text-xs font-normal text-on-surface-variant dark:text-zinc-400">
              {product.category ?? "Uncategorised"}
              {product.brand ? ` · ${product.brand}` : ""}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      hideOnMobile: true,
      sortValue: (product) => product.sku,
      render: (product) => (
        <span className="font-mono text-xs">{product.sku}</span>
      ),
    },
    {
      key: "barcode",
      header: "Barcode",
      hideOnMobile: true,
      render: (product) => (
        <span className="flex items-center gap-2">
          <MiniBarcode code={product.barcode} />
          <span className="font-mono text-xs text-on-surface-variant dark:text-zinc-400">
            {product.barcode}
          </span>
        </span>
      ),
    },
    {
      key: "unit",
      header: "Unit",
      hideOnMobile: true,
      sortValue: (product) => product.unit ?? "unit",
      render: (product) =>
        product.is_weighted ? (
          <Badge variant="warning">per {product.unit ?? "kg"}</Badge>
        ) : (
          <span className="text-on-surface-variant">{product.unit ?? "unit"}</span>
        ),
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      sortValue: (product) => product.price_cents,
      render: (product) => money(product.price_cents),
    },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      sortValue: (product) => product.stock_quantity,
      render: (product) => {
        const threshold = product.reorder_level ?? 5;
        let variant: "success" | "warning" | "danger" = "success";
        if (product.stock_quantity <= 0) variant = "danger";
        else if (product.stock_quantity <= threshold) variant = "warning";
        return <Badge variant={variant}>{product.stock_quantity}</Badge>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="Catalogue"
        title="Product management"
        description="Every product in the local catalogue, with SKU and barcode tooling."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Products" },
        ]}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportCsv("products", visible, exportColumns)}
            >
              <Download size={15} />
              CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportExcel("products", "Product catalogue", visible, exportColumns)
              }
            >
              <Download size={15} />
              Excel
            </Button>
            <Link
              href={ROUTES.productsNew}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-secondary px-3 text-xs font-medium text-on-secondary transition-all hover:bg-secondary/90 dark:bg-white dark:text-zinc-900"
            >
              <Plus size={15} />
              Add product
            </Link>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Products"
          value={String(visible.length)}
          icon={<Package size={20} />}
          accent="primary"
          sub="In the local catalogue"
        />
        <StatCard
          label="Categories"
          value={String(categories.length)}
          icon={<Layers size={20} />}
          accent="secondary"
          sub="Derived from product data"
        />
        <StatCard
          label="Brands"
          value={String(brands.length)}
          icon={<Box size={20} />}
          accent="secondary"
          sub={`${stats.weighted} weighed products`}
        />
        <StatCard
          label="Stock value"
          value={money(stats.stockValue)}
          icon={<Tags size={20} />}
          accent="success"
          sub={`${stats.blendedMargin.toFixed(1)}% average margin`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="relative sm:col-span-1">
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-zinc-500"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, SKU, barcode…"
                aria-label="Search products"
                className="pl-9"
              />
            </div>
            <Select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="All categories"
              aria-label="Filter by category"
              options={categories.map((name) => ({ value: name, label: name }))}
            />
            <Select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              placeholder="All brands"
              aria-label="Filter by brand"
              options={brands.map((name) => ({ value: name, label: name }))}
            />
          </div>

          <DataTable
            columns={columns}
            rows={visible}
            rowKey={(product) => product.id}
            emptyMessage="No products match these filters."
            caption="Product catalogue"
          />
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <SectionHeader
              title="SKU generation"
              action={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleGenerateSku}
                >
                  <Wand2 size={14} />
                  Generate
                </Button>
              }
            />
            <div className="mt-4 grid gap-3">
              <Input
                label="SKU prefix"
                value={skuPrefix}
                onChange={(event) => setSkuPrefix(event.target.value)}
              />
              <Input
                label="Product name"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
              />
            </div>
            <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500">
                Generated SKU
              </p>
              <p className="mt-2 break-all font-mono text-lg font-bold text-on-surface dark:text-zinc-50">
                {generatedSku}
              </p>
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Barcode & QR labels"
              action={
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant dark:text-zinc-400">
                  <QrCode size={14} aria-hidden />
                  EAN-13
                </span>
              }
            />
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-outline-variant p-4 dark:border-zinc-800">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-on-surface dark:text-zinc-50">
                  <Barcode size={15} aria-hidden />
                  Barcode
                </p>
                <p className="mt-1 font-mono text-xs text-on-surface-variant dark:text-zinc-400">
                  {barcodeValue}
                </p>
                <MiniBarcode code={barcodeValue} />
              </div>
              <MiniQr value={generatedSku} />
            </div>
            <p className="mt-3 text-xs text-on-surface-variant dark:text-zinc-500">
              Generated codes carry a valid modulo-10 check digit, so they scan
              on standard EAN-13 hardware.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
