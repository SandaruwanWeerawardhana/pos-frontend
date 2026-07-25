"use client";

import { PluginCartRow } from "@/components/plugin-slots/PluginCartRow";
import type { CartItem as CartItemType } from "@/lib/types";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

export function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: Readonly<CartItemProps>) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-2.5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container text-base font-semibold text-on-surface-variant dark:bg-zinc-800">
        {item.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-on-surface dark:text-zinc-50">
          {item.name}
        </p>
        <p className="text-xs text-on-surface-variant">
          {formatCents(item.unit_price_cents)}
        </p>
        <PluginCartRow item={item} />
      </div>

      <div className="flex items-center rounded-lg border border-outline-variant dark:border-zinc-700">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() =>
            item.id !== undefined && onUpdateQuantity(item.id, item.quantity - 1)
          }
          className="flex h-7 w-7 items-center justify-center text-on-surface-variant hover:text-on-surface dark:hover:text-zinc-50"
        >
          −
        </button>
        <span className="w-7 text-center text-sm font-medium tabular-nums">
          {item.quantity}
        </span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() =>
            item.id !== undefined && onUpdateQuantity(item.id, item.quantity + 1)
          }
          className="flex h-7 w-7 items-center justify-center text-on-surface-variant hover:text-on-surface dark:hover:text-zinc-50"
        >
          +
        </button>
      </div>

      <span className="w-16 text-right text-sm font-semibold tabular-nums text-on-surface dark:text-zinc-50">
        {formatCents(item.unit_price_cents * item.quantity)}
      </span>

      <button
        type="button"
        aria-label="Remove item"
        onClick={() => item.id !== undefined && onRemove(item.id)}
        className="text-outline-variant transition-colors hover:text-error dark:text-zinc-600"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
          <path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m2 0l-.5 12a2 2 0 01-2 2H8.5a2 2 0 01-2-2L6 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
