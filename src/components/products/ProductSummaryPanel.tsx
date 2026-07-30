"use client";

import Image from "next/image";
import { CloudUpload, Package, Save } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useSettings } from "@/lib/hooks/use-settings";
import { summarisePricing } from "@/lib/products/schema";
import type { ProductFormValues } from "@/lib/products/schema";

interface ProductSummaryPanelProps {
  values: ProductFormValues;
  errorCount: number;
  draftSavedAt: number | null;
  saving: boolean;
  onCancel: () => void;
}

function statusVariant(status: ProductFormValues["status"]) {
  if (status === "active") return "success" as const;
  if (status === "draft") return "warning" as const;
  return "neutral" as const;
}

// Desktop's sticky right rail: a live preview of the record being built and
// the primary actions. It is hidden below `lg`, where the bottom action bar
// takes over.
export function ProductSummaryPanel({
  values,
  errorCount,
  draftSavedAt,
  saving,
  onCancel,
}: Readonly<ProductSummaryPanelProps>) {
  const { money } = useSettings();
  const pricing = summarisePricing(values);
  const primaryImage = values.images[0];

  return (
    <aside className="hidden lg:sticky lg:top-20 lg:flex lg:h-fit lg:flex-col lg:gap-4">
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest/80 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        <div className="flex items-center gap-3">
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-container text-on-surface-variant dark:bg-zinc-800 dark:text-zinc-400">
            {primaryImage ? (
              <Image
                src={primaryImage}
                alt=""
                fill
                unoptimized
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <Package size={22} />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-on-surface dark:text-zinc-50">
              {values.name || "New product"}
            </p>
            <p className="truncate font-mono text-xs text-on-surface-variant dark:text-zinc-500">
              {values.sku || "SKU pending"}
            </p>
          </div>
        </div>

        <dl className="mt-4 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-on-surface-variant dark:text-zinc-400">Price</dt>
            <dd className="font-semibold tabular-nums text-on-surface dark:text-zinc-50">
              {pricing.grossPriceCents === null
                ? "—"
                : money(pricing.grossPriceCents)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-on-surface-variant dark:text-zinc-400">Stock</dt>
            <dd className="font-semibold tabular-nums text-on-surface dark:text-zinc-50">
              {values.initial_stock || "0"}
              {values.unit === "unit" ? "" : ` ${values.unit}`}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-on-surface-variant dark:text-zinc-400">Status</dt>
            <dd>
              <Badge variant={statusVariant(values.status)}>{values.status}</Badge>
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant bg-surface-container-lowest/80 p-4 shadow-sm backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
        {errorCount > 0 && (
          <p className="mb-1 text-xs font-medium text-error" role="status">
            {errorCount} field{errorCount === 1 ? "" : "s"} need attention
          </p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={saving}>
          <Save size={17} />
          {saving ? "Saving…" : "Save product"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="lg"
          fullWidth
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-[11px] text-on-surface-variant dark:text-zinc-500">
          <CloudUpload size={12} aria-hidden />
          {draftSavedAt
            ? `Draft saved ${new Date(draftSavedAt).toLocaleTimeString()}`
            : "Draft saves automatically"}
        </p>
      </div>
    </aside>
  );
}
