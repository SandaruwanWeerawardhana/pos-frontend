"use client";

import { Delete } from "lucide-react";

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  /** Swaps the decimal key for a clear key when entering whole quantities. */
  integerOnly?: boolean;
  disabled?: boolean;
}

// On-screen keypad for touch tills with no physical keyboard. The value stays
// a string so a partially-typed "12." round-trips without being coerced.
export function NumPad({
  value,
  onChange,
  onSubmit,
  submitLabel = "Enter",
  integerOnly = false,
  disabled = false,
}: Readonly<NumPadProps>) {
  const keys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    integerOnly ? "C" : ".",
    "0",
    "⌫",
  ];

  function press(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "C") {
      onChange("");
      return;
    }
    if (key === "." && value.includes(".")) return;
    // Cap at two decimals so the entry always maps cleanly onto integer cents.
    if (key !== "." && value.includes(".") && value.split(".")[1].length >= 2) {
      return;
    }
    onChange(value + key);
  }

  return (
    <div className="flex flex-col gap-2">
      <output
        aria-label="Entered amount"
        className="block rounded-xl border border-outline-variant px-4 py-3 text-right text-2xl font-bold tabular-nums text-on-surface dark:border-zinc-700 dark:text-zinc-50"
      >
        {value || "0"}
      </output>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={() => press(key)}
            aria-label={key === "⌫" ? "Backspace" : key}
            className="flex min-h-14 items-center justify-center rounded-xl bg-surface-container text-lg font-semibold text-on-surface transition-colors hover:bg-surface-container-high focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.97] disabled:opacity-40 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
          >
            {key === "⌫" ? <Delete size={20} aria-hidden /> : key}
          </button>
        ))}
      </div>
      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled}
          className="min-h-14 rounded-xl bg-secondary text-base font-semibold text-on-secondary transition-colors hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {submitLabel}
        </button>
      )}
    </div>
  );
}
