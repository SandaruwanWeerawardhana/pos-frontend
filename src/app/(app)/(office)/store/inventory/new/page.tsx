"use client";

import { useState, type SubmitEvent } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  PluginProductForm,
  type PluginFieldValues,
} from "@/components/plugin-slots/PluginProductForm";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

export default function NewProductPage() {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [pluginValues, setPluginValues] = useState<PluginFieldValues>({});
  const { showToast } = useToast();

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    showToast(
      "Not implemented — backend product-management endpoint pending",
      "error",
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-on-surface dark:text-zinc-50">
          Add product
        </h1>
        <Link
          href={ROUTES.inventory.root}
          className="text-sm text-on-surface-variant hover:underline dark:text-zinc-400"
        >
          Cancel
        </Link>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          label="Name"
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
          step="0.01"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
        />
        <PluginProductForm
          values={pluginValues}
          onChange={(key, value) =>
            setPluginValues((prev) => ({ ...prev, [key]: value }))
          }
        />
        <Button type="submit">Save product</Button>
      </form>
      <p className="text-xs text-on-surface-variant">
        Product creation isn&apos;t wired to a backend yet (no
        product-management endpoint exists) — this form is ready, submission
        is intentionally a no-op until then.
      </p>
    </div>
  );
}
