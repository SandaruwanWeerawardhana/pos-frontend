"use client";

import { Button } from "@/components/ui/Button";

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export function NumPad({ value, onChange, onSubmit }: NumPadProps) {
  function press(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && value.includes(".")) return;
    onChange(value + key);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-lg border border-zinc-300 px-3 py-2 text-right text-xl font-semibold tabular-nums dark:border-zinc-700 dark:text-zinc-50">
        {value || "0"}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => (
          <Button
            key={key}
            type="button"
            variant="secondary"
            onClick={() => press(key)}
          >
            {key}
          </Button>
        ))}
      </div>
      {onSubmit && (
        <Button type="button" onClick={onSubmit}>
          Enter
        </Button>
      )}
    </div>
  );
}
