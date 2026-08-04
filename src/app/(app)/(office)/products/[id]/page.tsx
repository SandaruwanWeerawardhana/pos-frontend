"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Barcode,
  Bell,
  Box,
  ChevronDown,
  Code,
  Database,
  Folder,
  Gift,
  Images,
  Info,
  Package,
  Printer,
  Ruler,
  ShieldCheck,
  Tag,
  Wallet,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import {
  getProduct,
  listStockMovements,
  listWarehouses,
} from "@/lib/db";
import type {
  Product,
  ProductType,
  StockMovement,
  Warehouse,
} from "@/lib/types";
import { BarcodeImage } from "@/components/products/BarcodeImage";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSettings } from "@/lib/hooks/use-settings";
import { printHtml } from "@/lib/export";
import { ROUTES } from "@/lib/types/routes";

const TYPE_LABELS: Record<ProductType, string> = {
  standard: "Single",
  variable: "Variable",
  service: "Service",
  combo: "Combo",
};

interface WarehouseStockLine {
  id: string;
  name: string;
  quantity: number;
}

/*
 * Stock is tracked per warehouse only where the data says so: the opening
 * split seeds each warehouse and movements that name one adjust it. Movements
 * with no warehouse (a till sale, a plain adjustment) are not attributed, so
 * the card's total comes from `stock_quantity` — the figure every other screen
 * shows — rather than from the sum of these lines.
 */
function warehouseStock(
  product: Product,
  movements: StockMovement[],
  warehouses: Warehouse[],
): WarehouseStockLine[] {
  const quantities = new Map<string, number>();

  for (const entry of product.opening_stock ?? []) {
    quantities.set(
      entry.warehouse_id,
      (quantities.get(entry.warehouse_id) ?? 0) + entry.quantity,
    );
  }

  for (const movement of movements) {
    if (!movement.warehouse_id) continue;
    quantities.set(
      movement.warehouse_id,
      (quantities.get(movement.warehouse_id) ?? 0) + movement.quantity_delta,
    );
  }

  if (quantities.size === 0) return [];

  return [...quantities.entries()].map(([id, quantity]) => ({
    id,
    name: warehouses.find((warehouse) => warehouse.id === id)?.name ?? "Warehouse",
    quantity,
  }));
}

function DetailRow({
  label,
  value,
  valueClassName = "text-on-surface dark:text-zinc-50",
}: Readonly<{ label: string; value: string; valueClassName?: string }>) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-dashed border-outline-variant py-3 last:border-b-0 dark:border-zinc-800">
      <span className="text-sm text-on-surface-variant dark:text-zinc-400">
        {label}
      </span>
      <span className={`text-sm font-semibold ${valueClassName}`}>{value}</span>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  accent,
}: Readonly<{
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}>) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-outline-variant border-l-4 bg-surface-container-lowest px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 ${accent}`}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container dark:bg-zinc-800">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400">
          {label}
        </span>
        <span className="block truncate text-lg font-bold text-on-surface dark:text-zinc-50">
          {value}
        </span>
      </span>
    </div>
  );
}

export default function ProductDetailsPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = use(params);
  const router = useRouter();
  const { money, settings } = useSettings();

  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    getProduct(id).then((found) => setProduct(found ?? null));
    listStockMovements({ productId: id }).then(setMovements);
    listWarehouses().then(setWarehouses);
  }, [id]);

  if (product === undefined) {
    return (
      <div className="flex flex-col gap-4 pb-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="flex flex-col gap-6 pb-8">
        <PageHeader
          title="Product Details"
          breadcrumbs={[
            { label: "Products", href: ROUTES.products },
            { label: "Product Details" },
          ]}
        />
        <EmptyState
          icon={<Package size={22} />}
          title="Product not found"
          description="It may have been deleted on this device or on another till."
          action={
            <Link
              href={ROUTES.products}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-secondary px-3 text-xs font-medium text-on-secondary dark:bg-white dark:text-zinc-900"
            >
              Back to products
            </Link>
          }
        />
      </div>
    );
  }

  const typeLabel = TYPE_LABELS[product.product_type ?? "standard"];
  const unit = product.unit ?? "pc";
  const gallery = product.images?.length
    ? product.images
    : [product.image_url].filter((image): image is string => Boolean(image));
  const stockAlert = product.reorder_level ?? settings.low_stock_threshold;
  const stockLines = warehouseStock(product, movements, warehouses);

  let discount = "—";
  if (product.discount_type === "percent" && product.discount_percent) {
    discount = `${product.discount_percent}%`;
  } else if (product.discount_type === "fixed" && product.discount_cents) {
    discount = money(product.discount_cents);
  }

  const detailRows: { label: string; value: string; valueClassName?: string }[] = [
    { label: "Type", value: typeLabel },
    { label: "Code Product", value: product.barcode },
    { label: "SKU", value: product.sku },
    { label: "Product Name", value: product.name },
    { label: "Category", value: product.category ?? "Uncategorised" },
    { label: "brand", value: product.brand ?? "N/D" },
    {
      label: "Cost",
      value: money(product.cost_cents ?? 0),
      valueClassName: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Price",
      value: money(product.price_cents),
      valueClassName: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Wholesale Price",
      value: money(product.wholesale_price_cents ?? 0),
      valueClassName: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "MinPrice",
      value: money(product.min_price_cents ?? 0),
      valueClassName: "text-error dark:text-red-400",
    },
    { label: "Unit", value: unit },
    { label: "Tax %", value: `${(product.tax_rate * 100).toFixed(2)} %` },
    { label: "Discount", value: discount },
    { label: "Stock Alert", value: stockAlert.toFixed(2) },
    {
      label: "Barcode Symbology",
      value: product.barcode_symbology ?? "CODE128",
    },
  ];

  const productName = product.name;

  function printDetails() {
    const rows = detailRows
      .map(
        (row) =>
          `<tr><th>${row.label}</th><td>${row.value}</td></tr>`,
      )
      .join("");
    printHtml(
      productName,
      `<h1>${productName}</h1><table>${rows}</table>`,
      "body{font-family:ui-sans-serif,system-ui,sans-serif;padding:16px}h1{font-size:18px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th{text-align:left;font-weight:500;color:#555;padding:6px 0}td{text-align:right;font-weight:600;padding:6px 0}tr{border-bottom:1px dashed #ddd}",
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="Product Details"
        breadcrumbs={[
          { label: "Products", href: ROUTES.products },
          { label: "Product Details" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={15} />
          back
        </Button>
        <Button type="button" size="sm" onClick={printDetails}>
          <Printer size={15} />
          Print
        </Button>
      </div>

      <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-primary to-secondary p-5 text-on-primary sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-5">
          <span className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            {gallery[0] ? (
              /* Supplier URLs and data URLs both land here, so next/image's
                 remote-host allowlist is skipped deliberately. */
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={gallery[0]}
                alt=""
                className="h-full w-full object-contain"
              />
            ) : (
              <Package size={32} className="text-zinc-400" aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-on-primary/20 px-3 py-1 text-xs font-semibold">
                {typeLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold">
                <Code size={13} aria-hidden />
                {product.barcode}
              </span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-bold">
              {product.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-on-primary/90">
              <span className="inline-flex items-center gap-1">
                <Folder size={14} aria-hidden />
                {product.category ?? "Uncategorised"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Ruler size={14} aria-hidden />
                {unit}
              </span>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-on-primary/15 px-8 py-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-on-primary/80">
            Price
          </p>
          <p className="mt-1 text-3xl font-bold">{money(product.price_cents)}</p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryTile
          label="Cost"
          value={money(product.cost_cents ?? 0)}
          icon={<Wallet size={18} className="text-indigo-600 dark:text-indigo-400" />}
          accent="border-l-indigo-500"
        />
        <SummaryTile
          label="Price"
          value={money(product.price_cents)}
          icon={<Tag size={18} className="text-emerald-600 dark:text-emerald-400" />}
          accent="border-l-emerald-500"
        />
        <SummaryTile
          label="Wholesale price"
          value={money(product.wholesale_price_cents ?? 0)}
          icon={<Gift size={18} className="text-amber-600 dark:text-amber-400" />}
          accent="border-l-amber-500"
        />
        <SummaryTile
          label="Minprice"
          value={money(product.min_price_cents ?? 0)}
          icon={<ChevronDown size={18} className="text-error dark:text-red-400" />}
          accent="border-l-red-500"
        />
        <SummaryTile
          label="Stock alert"
          value={stockAlert.toFixed(2)}
          icon={<Bell size={18} className="text-sky-600 dark:text-sky-400" />}
          accent="border-l-sky-500"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-zinc-100">
              <Barcode size={16} aria-hidden />
              Barcode
            </h3>
            <BarcodeImage
              value={product.barcode}
              symbology={product.barcode_symbology ?? "CODE128"}
            />
          </Card>

          <Card>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-zinc-100">
              <Info size={16} aria-hidden />
              Product Details
            </h3>
            {detailRows.map((row) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                valueClassName={row.valueClassName}
              />
            ))}
          </Card>

          {product.warranty && (
            <Card>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-zinc-100">
                <ShieldCheck size={16} aria-hidden />
                Warranty
              </h3>
              <DetailRow
                label="Warranty Period"
                value={`${product.warranty.period} ${product.warranty.unit}`}
              />
              {product.warranty.terms && (
                <DetailRow
                  label="Warranty Terms"
                  value={product.warranty.terms}
                />
              )}
              <DetailRow
                label="Manufacturer Guarantee"
                value={product.warranty.has_guarantee ? "Yes" : "No"}
              />
            </Card>
          )}

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-zinc-100">
                <Database size={16} aria-hidden />
                Warehouse Stock
              </h3>
              <span className="rounded-full bg-sky-500 px-3 py-1 text-xs font-semibold text-white">
                Total: {product.stock_quantity.toFixed(2)} {unit}
              </span>
            </div>
            {stockLines.length === 0 ? (
              <p className="text-sm text-on-surface-variant dark:text-zinc-400">
                No per-warehouse split recorded — all {product.stock_quantity.toFixed(2)}{" "}
                {unit} sit in the default warehouse.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {stockLines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white">
                      <WarehouseIcon size={18} aria-hidden />
                    </span>
                    <span>
                      <span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant dark:text-zinc-400">
                        {line.name}
                      </span>
                      <span className="block text-lg font-bold text-on-surface dark:text-zinc-50">
                        {line.quantity.toFixed(2)}{" "}
                        <span className="text-xs font-medium text-on-surface-variant dark:text-zinc-400">
                          {unit}
                        </span>
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-zinc-100">
            <Images size={16} aria-hidden />
            Gallery
            <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-xs font-semibold text-white">
              {gallery.length}
            </span>
          </h3>
          {gallery.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-outline-variant py-10 text-on-surface-variant dark:border-zinc-800 dark:text-zinc-400">
              <Box size={20} aria-hidden />
              <p className="text-sm">No images yet</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {gallery.map((image) => (
                <div
                  key={image}
                  className="flex items-center justify-center rounded-xl border border-outline-variant bg-white p-4 dark:border-zinc-800"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="max-h-48 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
