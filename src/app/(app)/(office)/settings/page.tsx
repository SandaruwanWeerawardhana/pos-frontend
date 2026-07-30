"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Save, Trash2 } from "lucide-react";
import { usePlugin } from "@/lib/hooks/use-plugin";
import { useSettings } from "@/lib/hooks/use-settings";
import { useTheme } from "@/components/providers/theme-provider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import type { StoreSettings, TaxRateSetting } from "@/lib/types";
import { ROUTES } from "@/lib/types/routes";

// Common presets so a shop doesn't have to know its own symbol/locale codes.
const CURRENCIES = [
  { code: "USD", symbol: "$", locale: "en-US", label: "US Dollar" },
  { code: "EUR", symbol: "€", locale: "de-DE", label: "Euro" },
  { code: "GBP", symbol: "£", locale: "en-GB", label: "British Pound" },
  { code: "LKR", symbol: "Rs", locale: "en-LK", label: "Sri Lankan Rupee" },
  { code: "INR", symbol: "₹", locale: "en-IN", label: "Indian Rupee" },
  { code: "AUD", symbol: "$", locale: "en-AU", label: "Australian Dollar" },
];

export default function SettingsPage() {
  const { settings, save, money } = useSettings();
  const { all, active, setActivePlugin } = usePlugin();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [draft, setDraft] = useState<StoreSettings>(settings);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Settings arrive from a liveQuery, so the local draft is re-seeded whenever
  // the stored value changes — unless the user has unsaved edits in progress.
  useEffect(() => {
    if (!dirty) setDraft(settings);
  }, [settings, dirty]);

  function update<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setDirty(true);
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateTaxRate(index: number, changes: Partial<TaxRateSetting>) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tax_rates: current.tax_rates.map((rate, position) =>
        position === index ? { ...rate, ...changes } : rate,
      ),
    }));
  }

  function addTaxRate() {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tax_rates: [
        ...current.tax_rates,
        { id: crypto.randomUUID(), name: "New rate", rate: 0 },
      ],
    }));
  }

  function removeTaxRate(index: number) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      tax_rates: current.tax_rates.filter((_, position) => position !== index),
    }));
  }

  function setDefaultTaxRate(index: number) {
    setDirty(true);
    setDraft((current) => ({
      ...current,
      // Exactly one rate carries the default flag, so clear the others.
      tax_rates: current.tax_rates.map((rate, position) => ({
        ...rate,
        is_default: position === index,
      })),
    }));
  }

  function applyCurrency(code: string) {
    const preset = CURRENCIES.find((entry) => entry.code === code);
    if (!preset) return;
    setDirty(true);
    setDraft((current) => ({
      ...current,
      currency_code: preset.code,
      currency_symbol: preset.symbol,
      locale: preset.locale,
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await save(draft);
      setDirty(false);
      showToast("Settings saved", "success");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-8">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Store identity, tax, currency, receipts, and appearance."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Settings" },
        ]}
        actions={
          <Button type="button" onClick={handleSave} disabled={saving || !dirty}>
            <Save size={16} />
            {saving ? "Saving…" : "Save settings"}
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionHeader title="Store details" />
          <div className="mt-4 flex flex-col gap-3">
            <Input
              label="Store name"
              value={draft.store_name}
              onChange={(event) => update("store_name", event.target.value)}
            />
            <Input
              label="Legal name"
              value={draft.legal_name ?? ""}
              onChange={(event) => update("legal_name", event.target.value)}
            />
            <Input
              label="Address"
              value={draft.address ?? ""}
              onChange={(event) => update("address", event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Phone"
                value={draft.phone ?? ""}
                onChange={(event) => update("phone", event.target.value)}
              />
              <Input
                label="Tax registration ID"
                value={draft.tax_id ?? ""}
                onChange={(event) => update("tax_id", event.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Currency & locale" />
          <div className="mt-4 flex flex-col gap-3">
            <Select
              label="Currency"
              value={draft.currency_code}
              onChange={(event) => applyCurrency(event.target.value)}
              options={CURRENCIES.map((entry) => ({
                value: entry.code,
                label: `${entry.label} (${entry.symbol})`,
              }))}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Symbol"
                value={draft.currency_symbol}
                onChange={(event) => update("currency_symbol", event.target.value)}
              />
              <Select
                label="Symbol position"
                value={draft.currency_position}
                onChange={(event) =>
                  update(
                    "currency_position",
                    event.target.value as StoreSettings["currency_position"],
                  )
                }
                options={[
                  { value: "before", label: "Before amount" },
                  { value: "after", label: "After amount" },
                ]}
              />
            </div>
            <Input
              label="Locale"
              value={draft.locale}
              onChange={(event) => update("locale", event.target.value)}
              placeholder="en-US"
            />
            <p className="rounded-lg bg-surface-container px-3 py-2 text-sm text-on-surface dark:bg-zinc-800 dark:text-zinc-100">
              Preview: <strong>{money(123456)}</strong>
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Tax rates"
            action={
              <Button type="button" variant="outline" size="sm" onClick={addTaxRate}>
                <Plus size={14} />
                Add rate
              </Button>
            }
          />
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100">
              <input
                type="checkbox"
                checked={draft.prices_include_tax}
                onChange={(event) =>
                  update("prices_include_tax", event.target.checked)
                }
                className="h-4 w-4 rounded border-outline-variant"
              />
              Shelf prices already include tax
            </label>

            {draft.tax_rates.map((rate, index) => (
              <div
                key={rate.id}
                className="flex items-end gap-2 rounded-xl border border-outline-variant p-3 dark:border-zinc-800"
              >
                <Input
                  label="Name"
                  value={rate.name}
                  onChange={(event) =>
                    updateTaxRate(index, { name: event.target.value })
                  }
                  className="flex-1"
                />
                <Input
                  label="Rate (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={(rate.rate * 100).toString()}
                  onChange={(event) =>
                    updateTaxRate(index, { rate: Number(event.target.value) / 100 })
                  }
                  className="w-24"
                />
                <button
                  type="button"
                  onClick={() => setDefaultTaxRate(index)}
                  className={`min-h-11 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors ${
                    rate.is_default
                      ? "bg-primary text-on-primary"
                      : "border border-outline-variant text-on-surface-variant hover:bg-surface-container dark:border-zinc-700"
                  }`}
                >
                  {rate.is_default ? "Default" : "Set default"}
                </button>
                <button
                  type="button"
                  onClick={() => removeTaxRate(index)}
                  aria-label={`Remove ${rate.name}`}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:text-error"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader title="Receipt" />
          <div className="mt-4 flex flex-col gap-3">
            <Input
              label="Header line"
              value={draft.receipt_header ?? ""}
              onChange={(event) => update("receipt_header", event.target.value)}
              placeholder="Shown under the store name"
            />
            <Input
              label="Footer line"
              value={draft.receipt_footer ?? ""}
              onChange={(event) => update("receipt_footer", event.target.value)}
            />
            <Select
              label="Paper width"
              value={draft.receipt_paper_width}
              onChange={(event) =>
                update(
                  "receipt_paper_width",
                  event.target.value as StoreSettings["receipt_paper_width"],
                )
              }
              options={[
                { value: "58mm", label: "58 mm" },
                { value: "80mm", label: "80 mm" },
              ]}
            />
            <label className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100">
              <input
                type="checkbox"
                checked={draft.receipt_show_tax_breakdown}
                onChange={(event) =>
                  update("receipt_show_tax_breakdown", event.target.checked)
                }
                className="h-4 w-4 rounded border-outline-variant"
              />
              Show tax breakdown on receipts
            </label>
            <label className="flex items-center gap-2 text-sm text-on-surface dark:text-zinc-100">
              <input
                type="checkbox"
                checked={draft.receipt_show_logo}
                onChange={(event) => update("receipt_show_logo", event.target.checked)}
                className="h-4 w-4 rounded border-outline-variant"
              />
              Show store name prominently
            </label>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Stock & loyalty thresholds" />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Input
              label="Low stock threshold"
              type="number"
              min="0"
              step="1"
              value={String(draft.low_stock_threshold)}
              onChange={(event) =>
                update("low_stock_threshold", Number(event.target.value))
              }
            />
            <Input
              label="Expiry warning (days)"
              type="number"
              min="0"
              step="1"
              value={String(draft.expiry_warning_days)}
              onChange={(event) =>
                update("expiry_warning_days", Number(event.target.value))
              }
            />
            <Input
              label="Points per unit spent"
              type="number"
              min="0"
              step="0.1"
              value={String(draft.loyalty_points_per_currency_unit)}
              onChange={(event) =>
                update(
                  "loyalty_points_per_currency_unit",
                  Number(event.target.value),
                )
              }
            />
          </div>
          <p className="mt-2 text-xs text-on-surface-variant dark:text-zinc-500">
            A product&apos;s own reorder level overrides the store-wide low stock
            threshold when it is set.
          </p>
        </Card>

        <Card>
          <SectionHeader title="Appearance" />
          <div className="mt-4 flex flex-col gap-3">
            <Select
              label="Theme"
              value={theme}
              onChange={(event) =>
                setTheme(event.target.value as "light" | "dark" | "system")
              }
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "Match system" },
              ]}
            />
            <p className="text-xs text-on-surface-variant dark:text-zinc-500">
              Theme is stored per device, so a shared back-office machine and a
              till can differ.
            </p>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Plugin" />
          <div className="mt-4 flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-on-surface-variant dark:text-zinc-300">
              <input
                type="radio"
                name="plugin"
                checked={active === null}
                onChange={() => setActivePlugin(null)}
              />
              None
            </label>
            {all.map((plugin) => (
              <label
                key={plugin.key}
                className="flex items-center gap-2 text-sm text-on-surface-variant dark:text-zinc-300"
              >
                <input
                  type="radio"
                  name="plugin"
                  checked={active?.key === plugin.key}
                  onChange={() => setActivePlugin(plugin.key)}
                />
                {plugin.label}
              </label>
            ))}
          </div>
          <Link
            href={ROUTES.settings.hardware}
            className="mt-4 inline-block text-sm font-medium text-primary hover:underline dark:text-blue-400"
          >
            Hardware setup →
          </Link>
        </Card>
      </div>
    </div>
  );
}
