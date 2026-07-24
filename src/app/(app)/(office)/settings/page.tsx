"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { usePlugin } from "@/lib/hooks/use-plugin";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ROUTES } from "@/lib/types/routes";

const SHOP_NAME_KEY = "shop_name";
const RECEIPT_FOOTER_KEY = "receipt_footer";

export default function SettingsPage() {
  const [shopName, setShopName] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const { all, active, setActivePlugin } = usePlugin();
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      db.syncMeta.get(SHOP_NAME_KEY),
      db.syncMeta.get(RECEIPT_FOOTER_KEY),
    ]).then(([name, footer]) => {
      if (typeof name?.value === "string") setShopName(name.value);
      if (typeof footer?.value === "string") setReceiptFooter(footer.value);
    });
  }, []);

  async function handleSave() {
    await db.syncMeta.put({ key: SHOP_NAME_KEY, value: shopName });
    await db.syncMeta.put({ key: RECEIPT_FOOTER_KEY, value: receiptFooter });
    showToast("Settings saved", "success");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div>
        <h1 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          Shop settings
        </h1>
        <div className="flex flex-col gap-3">
          <Input
            label="Shop name"
            value={shopName}
            onChange={(event) => setShopName(event.target.value)}
          />
          <Input
            label="Receipt footer"
            value={receiptFooter}
            onChange={(event) => setReceiptFooter(event.target.value)}
          />
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plugin
        </h2>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input
              type="radio"
              name="plugin"
              checked={active === null}
              onChange={() => setActivePlugin(null)}
            />
            <span>None</span>
          </label>
          {all.map((plugin) => (
            <label
              key={plugin.key}
              className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300"
            >
              <input
                type="radio"
                name="plugin"
                checked={active?.key === plugin.key}
                onChange={() => setActivePlugin(plugin.key)}
              />
              <span>{plugin.label}</span>
            </label>
          ))}
        </div>
      </div>

      <Link
        href={ROUTES.settings.hardware}
        className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
      >
        Hardware setup →
      </Link>
    </div>
  );
}
