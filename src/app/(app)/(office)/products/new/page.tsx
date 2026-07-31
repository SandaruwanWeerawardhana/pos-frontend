"use client";

import type { PluginFieldValues } from "@/components/plugin-slots/PluginProductForm";
import { InventorySection } from "@/components/products/InventorySection";
import { PricingSection } from "@/components/products/PricingSection";
import { ProductFormSkeleton } from "@/components/products/ProductFormSkeleton";
import { ProductInfoSection } from "@/components/products/ProductInfoSection";
import { ProductSummaryPanel } from "@/components/products/ProductSummaryPanel";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { addProduct } from "@/lib/db";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { useKeyboardShortcuts } from "@/lib/hooks/use-keyboard-shortcuts";
import { useProductCatalogueOptions } from "@/lib/hooks/use-product-catalogue-options";
import { useProductDuplicates } from "@/lib/hooks/use-product-duplicates";
import { useUnsavedChanges } from "@/lib/hooks/use-unsaved-changes";
import {
  DEFAULT_PRODUCT_FORM_VALUES,
  productFormSchema,
  toProduct,
  type ProductFormValues,
} from "@/lib/products/schema";
import { ROUTES } from "@/lib/types/routes";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { History, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

/**
 * Below-the-fold sections are code-split: a cashier adding a quick line often
 * never opens Media, so its bundle should not block the first paint of the
 * fields everyone fills in.
 */
const GrocerySection = lazy(() =>
  import("@/components/products/GrocerySection").then((module) => ({
    default: module.GrocerySection,
  })),
);
const MediaSection = lazy(() =>
  import("@/components/products/MediaSection").then((module) => ({
    default: module.MediaSection,
  })),
);
const AdditionalSettingsSection = lazy(() =>
  import("@/components/products/AdditionalSettingsSection").then((module) => ({
    default: module.AdditionalSettingsSection,
  })),
);

const DRAFT_KEY = "pos:draft:product-new";


const SECTIONS: { id: string; label: string; fields: (keyof ProductFormValues)[] }[] =
  [
    {
      id: "product-information",
      label: "Product information",
      fields: [
        "name",
        "sku",
        "barcode",
        "barcode_source",
        "category",
        "unit",
        "description",
      ],
    },
    {
      id: "pricing",
      label: "Pricing",
      fields: ["selling_price", "cost_price", "tax_rate", "discount_percent"],
    },
    {
      id: "inventory",
      label: "Inventory",
      fields: ["initial_stock", "min_stock_level"],
    },
    {
      id: "grocery",
      label: "Grocery information",
      fields: ["expiry_date", "manufacturing_date"],
    },
    { id: "media", label: "Media", fields: ["images"] },
    { id: "additional-settings", label: "Additional settings", fields: [] },
  ];

function SectionFallback() {
  return <Skeleton className="h-20 w-full rounded-2xl" />;
}

export default function ProductAddPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: DEFAULT_PRODUCT_FORM_VALUES,
    mode: "onBlur",
    reValidateMode: "onChange",
  });
  const { control, formState, handleSubmit, reset, setError, setFocus } = form;

  const [saving, setSaving] = useState(false);
  const [pluginValues, setPluginValues] = useState<PluginFieldValues>({});
  const [draftPromptOpen, setDraftPromptOpen] = useState(true);

  const values = useWatch({ control }) as ProductFormValues;
  const options = useProductCatalogueOptions();
  const duplicates = useProductDuplicates(values.sku ?? "", values.barcode ?? "");

  const dirty = formState.isDirty && !saving;
  const draft = useFormDraft<ProductFormValues>(DRAFT_KEY, values, {
    enabled: dirty,
  });
  const guard = useUnsavedChanges(dirty);

  const sectionStatuses = SECTIONS.map((section) => ({
    id: section.id,
    label: section.label,
    errorCount: section.fields.filter((field) => formState.errors[field]).length,
  }));
  const errorCount = sectionStatuses.reduce(
    (total, section) => total + section.errorCount,
    0,
  );
  const errorsFor = (id: string) =>
    sectionStatuses.find((section) => section.id === id)?.errorCount ?? 0;

  const onSubmit = handleSubmit(async (submitted) => {
    if (duplicates.skuTaken) {
      setError("sku", { type: "manual", message: "SKU already exists" });
      setFocus("sku");
      return;
    }
    if (duplicates.barcodeTaken) {
      setError("barcode", { type: "manual", message: "Barcode already exists" });
      setFocus("barcode");
      return;
    }

    setSaving(true);
    try {
      const product = toProduct(submitted, crypto.randomUUID());
      await addProduct(
        Object.keys(pluginValues).length > 0
          ? { ...product, plugin_data: pluginValues }
          : product,
      );
      draft.discard();
      reset(DEFAULT_PRODUCT_FORM_VALUES);
      await queryClient.invalidateQueries({ queryKey: ["product-options"] });
      showToast(`${product.name} added to the catalogue`, "success");
      router.push(ROUTES.products);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add product";
      if (message.includes("SKU")) setError("sku", { type: "manual", message });
      if (message.includes("Barcode")) {
        setError("barcode", { type: "manual", message });
      }
      showToast(message, "error");
      setSaving(false);
    }
  }, () => showToast("Some fields need attention before saving", "error"));

  useKeyboardShortcuts([
    { key: "s", ctrl: true, label: "Save product", handler: () => void onSubmit() },
  ]);

  const showDraftBanner =
    draftPromptOpen && draft.restored !== null && !formState.isDirty;

  return (
    <div className="flex flex-col gap-5 pb-28 lg:pb-8">
      <PageHeader
        eyebrow="Product management"
        title="Add product"
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Products", href: ROUTES.products },
          { label: "Add product" },
        ]}
      />

      {showDraftBanner && draft.restored && (
        <div className="flex flex-col gap-3 rounded-2xl border border-secondary/40 bg-secondary/5 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-500/40 dark:bg-blue-500/10">
          <p className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100">
            <History size={16} aria-hidden className="shrink-0" />
            Unsaved draft from{" "}
            {new Date(draft.restored.savedAt).toLocaleString()} found.
          </p>
          <span className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                reset(draft.restored?.values ?? DEFAULT_PRODUCT_FORM_VALUES, {
                  keepDirty: true,
                });
                setDraftPromptOpen(false);
                showToast("Draft restored", "info");
              }}
            >
              Restore draft
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                draft.discard();
                setDraftPromptOpen(false);
              }}
            >
              Discard
            </Button>
          </span>
        </div>
      )}

      {options.loading ? (
        <ProductFormSkeleton />
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start"
        >
          <div className="min-w-0 rounded-2xl border border-outline-variant bg-surface-container-lowest/80 p-4 shadow-sm backdrop-blur-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="flex flex-col gap-8">
              <ProductInfoSection
                form={form}
                options={options}
                duplicates={duplicates}
                errorCount={errorsFor("product-information")}
              />
              <PricingSection form={form} errorCount={errorsFor("pricing")} />
              <InventorySection form={form} errorCount={errorsFor("inventory")} />
              <Suspense fallback={<SectionFallback />}>
                <GrocerySection form={form} errorCount={errorsFor("grocery")} />
              </Suspense>
              <Suspense fallback={<SectionFallback />}>
                <MediaSection form={form} errorCount={errorsFor("media")} />
              </Suspense>
              <Suspense fallback={<SectionFallback />}>
                <AdditionalSettingsSection
                  form={form}
                  pluginValues={pluginValues}
                  onPluginChange={(key, value) =>
                    setPluginValues((current) => ({ ...current, [key]: value }))
                  }
                />
              </Suspense>
            </div>
          </div>

          <ProductSummaryPanel
            values={values}
            errorCount={errorCount}
            draftSavedAt={draft.savedAt}
            saving={saving}
            onCancel={() => guard.requestNavigation(ROUTES.products)}
          />

          {/* Mobile/tablet action bar. Fixed rather than sticky so it stays
              reachable with a thumb while the long form scrolls behind it. */}
          <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-outline-variant bg-surface-container-lowest/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => guard.requestNavigation(ROUTES.products)}
              disabled={saving}
              className="flex-1"
            >
              <X size={17} />
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={saving} className="flex-[2]">
              <Save size={17} />
              {saving ? "Saving…" : "Save product"}
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={guard.pendingHref !== null}
        title="Leave without saving?"
        message="This product has unsaved changes. A draft is kept on this device, but nothing has been added to the catalogue yet."
        confirmLabel="Leave page"
        cancelLabel="Keep editing"
        destructive
        onConfirm={guard.confirmNavigation}
        onCancel={guard.cancelNavigation}
      />
    </div>
  );
}
