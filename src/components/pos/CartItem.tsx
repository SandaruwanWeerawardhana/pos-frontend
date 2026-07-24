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

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-zinc-100 py-2 dark:border-zinc-800">
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {item.name}
        </p>
        <PluginCartRow item={item} />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() =>
            item.id !== undefined && onUpdateQuantity(item.id, item.quantity - 1)
          }
          className="h-6 w-6 rounded-full border border-zinc-300 text-sm dark:border-zinc-700"
        >
          −
        </button>
        <span className="w-8 text-center text-sm tabular-nums">
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() =>
            item.id !== undefined && onUpdateQuantity(item.id, item.quantity + 1)
          }
          className="h-6 w-6 rounded-full border border-zinc-300 text-sm dark:border-zinc-700"
        >
          +
        </button>
      </div>
      <span className="w-16 text-right text-sm tabular-nums">
        {formatCents(item.unit_price_cents * item.quantity)}
      </span>
      <button
        type="button"
        onClick={() => item.id !== undefined && onRemove(item.id)}
        className="text-xs text-red-600 hover:underline"
      >
        Remove
      </button>
    </div>
  );
}
