"use client";

import { useScale } from "@/lib/hooks/use-scale";
import { Button } from "@/components/ui/Button";

export function ScaleDisplay() {
  const { reading, tare } = useScale();
  const kg = reading ? reading.grams / 1000 : 0;
  let statusText = "No reading";

  if (reading) {
    statusText = reading.stable ? "Stable" : "Reading…";
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-2 dark:border-zinc-800">
      <div>
        <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {kg.toFixed(3)}{" "}
          <span className="text-sm font-normal text-zinc-500">kg</span>
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {statusText}
        </p>
      </div>
      <Button type="button" variant="secondary" size="sm" onClick={tare}>
        Tare
      </Button>
    </div>
  );
}
