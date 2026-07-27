"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Barcode,
  Box,
  Image as ImageIcon,
  Layers,
  Package,
  Plus,
  QrCode,
  Search,
  Tags,
  Wand2,
} from "lucide-react";
import { searchProducts } from "@/lib/db";
import type { Product } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CategoryNode {
  name: string;
  subcategories: string[];
  productCount: number;
}

interface BrandSummary {
  name: string;
  vendorCode: string;
  productCount: number;
  status: "active" | "review";
}

interface VariantGroup {
  name: string;
  values: string[];
}

interface BundleItem {
  name: string;
  sku: string;
  items: number;
  priceCents: number;
}

const CATEGORY_TREE: CategoryNode[] = [
  {
    name: "Fresh Produce",
    subcategories: ["Fruit", "Vegetables", "Leafy greens"],
    productCount: 128,
  },
  {
    name: "Dairy and Eggs",
    subcategories: ["Milk", "Cheese", "Yogurt"],
    productCount: 84,
  },
  {
    name: "Pantry",
    subcategories: ["Rice", "Pasta", "Canned goods"],
    productCount: 212,
  },
  {
    name: "Beverages",
    subcategories: ["Water", "Juice", "Soft drinks"],
    productCount: 96,
  },
];

const BRANDS: BrandSummary[] = [
  { name: "Harvest Hill", vendorCode: "HRV", productCount: 42, status: "active" },
  { name: "Daily Fresh", vendorCode: "DLF", productCount: 37, status: "active" },
  { name: "Swift Essentials", vendorCode: "SWE", productCount: 64, status: "active" },
  { name: "Metro Choice", vendorCode: "MTC", productCount: 18, status: "review" },
];

const VARIANT_GROUPS: VariantGroup[] = [
  { name: "Size", values: ["250 g", "500 g", "1 kg", "Family pack"] },
  { name: "Flavour", values: ["Original", "Vanilla", "Strawberry", "Chocolate"] },
  { name: "Colour", values: ["Red", "Green", "Blue", "Mixed"] },
];

const BUNDLES: BundleItem[] = [
  { name: "Breakfast starter pack", sku: "BDL-BRK-001", items: 5, priceCents: 1890 },
  { name: "Weekly pantry box", sku: "BDL-PAN-014", items: 8, priceCents: 4290 },
  { name: "School lunch combo", sku: "BDL-LCH-007", items: 4, priceCents: 1250 },
];

const PRODUCT_TAGS = [
  "Organic",
  "Imported",
  "Local",
  "Gluten free",
  "Vegan",
  "Promo",
  "Fast moving",
  "Cold chain",
];

const IMAGE_SLOTS = ["Front", "Back", "Nutrition", "Shelf"];

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

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

function makeBarcode(seed: string): string {
  const digits = seed
    .split("")
    .reduce((total, char) => total + char.charCodeAt(0), 0)
    .toString()
    .padStart(6, "0");
  return `893${digits}045`;
}

function MiniBarcode({ code }: Readonly<{ code: string }>) {
  const bars = code
    .split("")
    .map((digit, index) => Number(digit) + index)
    .slice(0, 12);

  return (
    <div aria-label={`Barcode ${code}`} className="flex h-10 items-end gap-0.5">
      {bars.map((bar, index) => (
        <span
          key={`${code}-${index}`}
          className="w-1 rounded-sm bg-on-surface dark:bg-zinc-200"
          style={{ height: `${14 + (bar % 5) * 5}px` }}
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

function FeatureCard({
  icon,
  title,
  value,
  detail,
}: Readonly<{
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
}>) {
  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary">
          {icon}
        </span>
        <div>
          <p className="text-sm font-semibold text-on-surface dark:text-zinc-50">
            {title}
          </p>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400">
            {detail}
          </p>
        </div>
      </div>
      <p className="mt-4 text-2xl font-bold text-on-surface dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function SectionTitle({
  title,
  action,
}: Readonly<{ title: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500">
        {title}
      </h2>
      {action}
    </div>
  );
}

export default function ProductsPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productName, setProductName] = useState("Organic apple pack");
  const [skuPrefix, setSkuPrefix] = useState("GRC");
  const [generatedSku, setGeneratedSku] = useState("GRC-ORGANIC-APPLE-A1B2");
  const [barcodeValue, setBarcodeValue] = useState("893000124045");
  const [selectedTags, setSelectedTags] = useState<string[]>([
    "Organic",
    "Fast moving",
  ]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      searchProducts(query).then(setProducts);
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const catalogueStats = useMemo(() => {
    const stockValue = products.reduce(
      (total, product) => total + product.price_cents * product.stock_quantity,
      0,
    );
    const lowStock = products.filter((product) => product.stock_quantity <= 5).length;
    return {
      productCount: products.length,
      stockValue,
      lowStock,
    };
  }, [products]);

  function handleGenerateSku() {
    const nextSku = makeSku(skuPrefix, productName);
    setGeneratedSku(nextSku);
    setBarcodeValue(makeBarcode(nextSku));
  }

  function handleTagToggle(tag: string) {
    setSelectedTags((current) =>
      current.includes(tag)
        ? current.filter((item) => item !== tag)
        : [...current, tag],
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary dark:text-blue-400">
            Product management
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm">
            <Barcode size={15} />
            Scan barcode
          </Button>
          <Button type="button" size="sm">
            <Plus size={15} />
            Add product
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FeatureCard
          icon={<Package size={20} />}
          title="Catalogue"
          value={String(catalogueStats.productCount)}
          detail="Products in local cache"
        />
        <FeatureCard
          icon={<Layers size={20} />}
          title="Categories"
          value={String(CATEGORY_TREE.length)}
          detail="Primary category groups"
        />
        <FeatureCard
          icon={<Box size={20} />}
          title="Brands"
          value={String(BRANDS.length)}
          detail="Managed supplier brands"
        />
        <FeatureCard
          icon={<Tags size={20} />}
          title="Stock value"
          value={formatCents(catalogueStats.stockValue)}
          detail={`${catalogueStats.lowStock} low-stock products`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-outline-variant p-4 dark:border-zinc-800">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <SectionTitle title="Product catalogue" />
              <div className="relative w-full lg:max-w-sm">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-zinc-500"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, SKU, barcode..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant dark:bg-zinc-950 dark:text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Barcode</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/60 dark:divide-zinc-800">
                {products.map((product, index) => {
                  const category = CATEGORY_TREE[index % CATEGORY_TREE.length];
                  const brand = BRANDS[index % BRANDS.length];
                  const tags = PRODUCT_TAGS.slice(index % 3, index % 3 + 2);
                  return (
                    <tr
                      key={product.id}
                      className="text-on-surface transition-colors hover:bg-surface-container-low dark:text-zinc-50 dark:hover:bg-zinc-800/60"
                    >
                      <td className="min-w-56 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container text-sm font-bold text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-300">
                            {product.name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold">{product.name}</p>
                            <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                              {category.name} / {category.subcategories[0]} / {brand.name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MiniBarcode code={product.barcode} />
                          <span className="font-mono text-xs text-on-surface-variant dark:text-zinc-400">
                            {product.barcode}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {formatCents(product.price_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            product.stock_quantity <= 0
                              ? "danger"
                              : product.stock_quantity <= 5
                              ? "warning"
                              : "success"
                          }
                        >
                          {product.stock_quantity}
                        </Badge>
                      </td>
                      <td className="min-w-40 px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag) => (
                            <Badge key={`${product.id}-${tag}`} variant="neutral">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {products.length === 0 && (
              <p className="py-10 text-center text-sm text-on-surface-variant dark:text-zinc-400">
                No products match current search.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <SectionTitle
              title="SKU generation"
              action={
                <Button type="button" variant="secondary" size="sm" onClick={handleGenerateSku}>
                  <Wand2 size={14} />
                  Generate
                </Button>
              }
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-[0.7fr_1.3fr] xl:grid-cols-1">
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
          </div>

          <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <SectionTitle
              title="Barcode and QR support"
              action={
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant dark:text-zinc-400">
                  <QrCode size={14} />
                  QR ready
                </span>
              }
            />
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-outline-variant p-4 dark:border-zinc-800">
              <div>
                <p className="text-sm font-semibold text-on-surface dark:text-zinc-50">
                  Barcode
                </p>
                <p className="mt-1 font-mono text-xs text-on-surface-variant dark:text-zinc-400">
                  {barcodeValue}
                </p>
                <MiniBarcode code={barcodeValue} />
              </div>
              <MiniQr value={generatedSku} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <SectionTitle title="Categories and subcategories" />
          <div className="mt-4 space-y-3">
            {CATEGORY_TREE.map((category) => (
              <div
                key={category.name}
                className="rounded-xl border border-outline-variant p-3 dark:border-zinc-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-on-surface dark:text-zinc-50">
                    {category.name}
                  </p>
                  <Badge variant="neutral">{category.productCount} items</Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {category.subcategories.map((subcategory) => (
                    <Badge key={subcategory} variant="neutral">
                      {subcategory}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <SectionTitle title="Brand management" />
          <div className="mt-4 space-y-3">
            {BRANDS.map((brand) => (
              <div
                key={brand.name}
                className="flex items-center justify-between rounded-xl border border-outline-variant p-3 dark:border-zinc-800"
              >
                <div>
                  <p className="font-semibold text-on-surface dark:text-zinc-50">
                    {brand.name}
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                    Vendor code {brand.vendorCode} / {brand.productCount} products
                  </p>
                </div>
                <Badge variant={brand.status === "active" ? "success" : "warning"}>
                  {brand.status}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <SectionTitle title="Multiple product images" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {IMAGE_SLOTS.map((slot, index) => (
              <button
                key={slot}
                type="button"
                className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-outline-variant text-sm font-medium transition hover:border-primary hover:bg-primary/5 dark:border-zinc-700 dark:hover:border-blue-500 ${
                  index === 0
                    ? "bg-surface-container text-on-surface dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-on-surface-variant dark:text-zinc-400"
                }`}
              >
                <ImageIcon size={20} />
                {slot}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <SectionTitle title="Product variants" />
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
            {VARIANT_GROUPS.map((group) => (
              <div
                key={group.name}
                className="rounded-xl border border-outline-variant p-3 dark:border-zinc-800"
              >
                <p className="font-semibold text-on-surface dark:text-zinc-50">
                  {group.name}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.values.map((value) => (
                    <Badge key={`${group.name}-${value}`} variant="neutral">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <SectionTitle title="Product bundles" />
          <div className="mt-4 space-y-3">
            {BUNDLES.map((bundle) => (
              <div
                key={bundle.sku}
                className="flex items-center justify-between rounded-xl border border-outline-variant p-3 dark:border-zinc-800"
              >
                <div>
                  <p className="font-semibold text-on-surface dark:text-zinc-50">
                    {bundle.name}
                  </p>
                  <p className="text-xs text-on-surface-variant dark:text-zinc-400">
                    {bundle.sku} / {bundle.items} bundled products
                  </p>
                </div>
                <p className="font-semibold text-on-surface dark:text-zinc-50">
                  {formatCents(bundle.priceCents)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <SectionTitle title="Product tags" />
        <div className="mt-4 flex flex-wrap gap-2">
          {PRODUCT_TAGS.map((tag) => {
            const selected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
