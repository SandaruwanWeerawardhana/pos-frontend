"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Package,
  Pencil,
  Plus,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  addProduct,
  deleteProduct,
  listBrands,
  listCategories,
  searchProducts,
} from "@/lib/db";
import type { Product, ProductType } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable, type DataColumn } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useSettings } from "@/lib/hooks/use-settings";
import { exportExcel, exportPdf, type ExportColumn } from "@/lib/export";
import { generateBarcode, generateSku } from "@/lib/products/generate";
import { ROUTES } from "@/lib/types/routes";

// Short labels for the table; the full wording lives in PRODUCT_TYPE_OPTIONS
// and is too long for a column this narrow.
const TYPE_LABELS: Record<ProductType, string> = {
  standard: "Single",
  variable: "Variable",
  service: "Service",
  combo: "Combo",
};

const ACTION_BUTTON_CLASSES =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-outline-variant transition-all duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-700";

function ProductThumbnail({ product }: Readonly<{ product: Product }>) {
  const source = product.image_url ?? product.images?.[0];

  if (!source) {
    return (
      <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-outline-variant bg-surface-container text-on-surface-variant dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
        <Package size={18} aria-hidden />
      </span>
    );
  }

  return (
    // Product images come from arbitrary supplier URLs and data URLs, so a
    // plain <img> avoids next/image's remote-host allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt=""
      loading="lazy"
      className="h-11 w-11 rounded-lg border border-outline-variant object-cover dark:border-zinc-700"
    />
  );
}

export default function ProductsPage() {
  const { money, settings } = useSettings();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // Either one product (row action) or the current selection (bulk action).
  const [pendingDelete, setPendingDelete] = useState<Product[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const reload = useCallback(() => {
    searchProducts(query).then(setProducts);
  }, [query]);

  const reloadFacets = useCallback(() => {
    listCategories().then(setCategories);
    listBrands().then(setBrands);
  }, []);

  useEffect(() => {
    reloadFacets();
  }, [reloadFacets]);

  useEffect(() => {
    const timeoutId = window.setTimeout(reload, 200);
    return () => window.clearTimeout(timeoutId);
  }, [reload]);

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

  const selectedProducts = useMemo(
    () => visible.filter((product) => selectedIds.includes(product.id)),
    [visible, selectedIds],
  );

  const exportColumns: ExportColumn<Product>[] = [
    { key: "name", header: "Name", value: (p) => p.name },
    {
      key: "type",
      header: "Type",
      value: (p) => TYPE_LABELS[p.product_type ?? "standard"],
    },
    { key: "code", header: "Code", value: (p) => p.barcode },
    { key: "sku", header: "SKU", value: (p) => p.sku },
    { key: "brand", header: "Brand", value: (p) => p.brand ?? "" },
    { key: "category", header: "Category", value: (p) => p.category ?? "" },
    { key: "cost", header: "Cost", value: (p) => ((p.cost_cents ?? 0) / 100).toFixed(2) },
    { key: "price", header: "Price", value: (p) => (p.price_cents / 100).toFixed(2) },
    { key: "unit", header: "Unit", value: (p) => p.unit ?? "pc" },
    { key: "stock", header: "Quantity", value: (p) => p.stock_quantity },
  ];

  async function duplicateProduct(product: Product) {
    // A duplicate starts empty of stock and carries fresh identifiers: SKU and
    // barcode are unique in Dexie, and copied batches would claim stock the
    // new row does not have.
    const copy: Product = {
      ...product,
      id: crypto.randomUUID(),
      name: `${product.name} (copy)`,
      sku: generateSku({
        name: product.name,
        category: product.category,
        brand: product.brand,
      }),
      barcode: generateBarcode(),
      barcode_source: "generated",
      stock_quantity: 0,
      batches: undefined,
      opening_stock: undefined,
      _pending_update: undefined,
    };

    try {
      await addProduct(copy);
      showToast(`Duplicated ${product.name}`, "success");
      reload();
      reloadFacets();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not duplicate product",
        "error",
      );
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      for (const product of pendingDelete) {
        await deleteProduct(product.id);
      }
      showToast(
        pendingDelete.length === 1
          ? `Deleted ${pendingDelete[0].name}`
          : `Deleted ${pendingDelete.length} products`,
        "success",
      );
      setSelectedIds((current) =>
        current.filter((id) => !pendingDelete.some((p) => p.id === id)),
      );
      setPendingDelete(null);
      reload();
      reloadFacets();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not delete product",
        "error",
      );
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataColumn<Product>[] = [
    {
      key: "image",
      header: "Image",
      render: (product) => <ProductThumbnail product={product} />,
    },
    {
      key: "type",
      header: "Type",
      hideOnMobile: true,
      sortValue: (product) => TYPE_LABELS[product.product_type ?? "standard"],
      render: (product) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {TYPE_LABELS[product.product_type ?? "standard"]}
        </span>
      ),
    },
    {
      key: "name",
      header: "Name",
      sortValue: (product) => product.name,
      render: (product) => (
        <Link
          href={ROUTES.inventory.detail(product.id)}
          className="font-medium text-primary hover:underline dark:text-blue-400"
        >
          {product.name}
        </Link>
      ),
    },
    {
      key: "code",
      header: "Code",
      hideOnMobile: true,
      sortValue: (product) => product.barcode,
      render: (product) => (
        <span className="font-mono text-xs">{product.barcode}</span>
      ),
    },
    {
      key: "brand",
      header: "Brand",
      hideOnMobile: true,
      sortValue: (product) => product.brand ?? "",
      render: (product) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {product.brand ?? "N/D"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      hideOnMobile: true,
      sortValue: (product) => product.category ?? "",
      render: (product) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {product.category ?? "Uncategorised"}
        </span>
      ),
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      hideOnMobile: true,
      sortValue: (product) => product.cost_cents ?? 0,
      render: (product) =>
        product.cost_cents ? money(product.cost_cents) : "—",
    },
    {
      key: "price",
      header: "Price",
      align: "right",
      sortValue: (product) => product.price_cents,
      render: (product) => money(product.price_cents),
    },
    {
      key: "unit",
      header: "Unit",
      hideOnMobile: true,
      sortValue: (product) => product.unit ?? "pc",
      render: (product) => (
        <span className="text-on-surface-variant dark:text-zinc-400">
          {product.unit ?? "pc"}
        </span>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      align: "right",
      sortValue: (product) => product.stock_quantity,
      render: (product) => {
        const threshold = product.reorder_level ?? settings.low_stock_threshold;
        let tone = "text-on-surface dark:text-zinc-50";
        if (product.stock_quantity <= 0) tone = "text-error dark:text-red-400";
        else if (product.stock_quantity <= threshold) {
          tone = "text-amber-600 dark:text-amber-400";
        }
        return (
          <span className={`font-medium ${tone}`}>
            {product.stock_quantity.toFixed(2)} {product.unit ?? "pc"}
          </span>
        );
      },
    },
    {
      key: "action",
      header: "Action",
      render: (product) => (
        <span className="flex items-center gap-1.5">
          <Link
            href={ROUTES.inventory.detail(product.id)}
            aria-label={`View ${product.name}`}
            title="View"
            className={`${ACTION_BUTTON_CLASSES} text-secondary hover:bg-surface-container dark:text-blue-400 dark:hover:bg-zinc-800`}
          >
            <Eye size={15} aria-hidden />
          </Link>
          <Link
            href={ROUTES.inventory.detail(product.id)}
            aria-label={`Edit ${product.name}`}
            title="Edit"
            className={`${ACTION_BUTTON_CLASSES} text-emerald-600 hover:bg-surface-container dark:text-emerald-400 dark:hover:bg-zinc-800`}
          >
            <Pencil size={15} aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => duplicateProduct(product)}
            aria-label={`Duplicate ${product.name}`}
            title="Duplicate"
            className={`${ACTION_BUTTON_CLASSES} text-amber-600 hover:bg-surface-container dark:text-amber-400 dark:hover:bg-zinc-800`}
          >
            <Copy size={15} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete([product])}
            aria-label={`Delete ${product.name}`}
            title="Delete"
            className={`${ACTION_BUTTON_CLASSES} text-error hover:bg-surface-container dark:text-red-400 dark:hover:bg-zinc-800`}
          >
            <X size={15} aria-hidden />
          </button>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        title="All Products"
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Products" },
          { label: "All Products" },
        ]}
      />

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative lg:w-72">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-zinc-500"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this table"
              aria-label="Search products"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <Filter size={15} />
              Filter
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportPdf("All Products", visible, exportColumns)}
            >
              <FileText size={15} />
              PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                exportExcel("products", "All Products", visible, exportColumns)
              }
            >
              <FileSpreadsheet size={15} />
              EXCEL
            </Button>
            <Link
              href={ROUTES.catalogue.import}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-outline-variant px-3 text-xs font-medium text-on-surface transition-all duration-[var(--duration-fast)] hover:bg-surface-container dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              <Upload size={15} />
              Import products
            </Link>
            <Link
              href={ROUTES.productsNew}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-secondary px-3 text-xs font-medium text-on-secondary transition-all duration-[var(--duration-fast)] hover:bg-secondary/90 dark:bg-white dark:text-zinc-900"
            >
              <Plus size={15} />
              Create
            </Link>
          </div>
        </div>

        {filtersOpen && (
          <div className="animate-fade-in grid gap-3 rounded-xl border border-outline-variant p-3 sm:grid-cols-2 lg:grid-cols-4 dark:border-zinc-800">
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
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCategory("");
                setBrand("");
              }}
              className="justify-self-start"
            >
              Clear filters
            </Button>
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-on-surface-variant dark:text-zinc-400">
              {selectedProducts.length} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds([])}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setPendingDelete(selectedProducts)}
              >
                Delete selected
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(product) => product.id}
          emptyMessage="No products match these filters."
          caption="All products"
          selection={{ selectedIds, onChange: setSelectedIds }}
        />
      </section>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete && pendingDelete.length > 1
            ? "Delete products"
            : "Delete product"
        }
        message={
          pendingDelete && pendingDelete.length > 1
            ? `Delete ${pendingDelete.length} products? They leave the till and every report immediately.`
            : `Delete ${pendingDelete?.[0]?.name ?? "this product"}? It leaves the till and every report immediately.`
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
