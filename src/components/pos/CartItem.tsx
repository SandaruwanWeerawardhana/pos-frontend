"use client";

import { useRef, useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { PluginCartRow } from "@/components/plugin-slots/PluginCartRow";
import { useSettings } from "@/lib/hooks/use-settings";
import { formatQuantity } from "@/lib/format";
import type { CartItem as CartItemType } from "@/lib/types";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
}

// Distance (px) a horizontal drag must travel before it counts as a
// swipe-to-remove rather than an accidental scroll.
const SWIPE_THRESHOLD_PX = 96;

export function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: Readonly<CartItemProps>) {
  const { money } = useSettings();
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef<number | null>(null);

  // Weighted lines come off the scale, so ±1 stepping is meaningless; they
  // step by 0.1 of the unit instead.
  const step = item.is_weighted ? 0.1 : 1;

  function changeQuantity(delta: number) {
    if (item.id === undefined) return;
    const next = Math.round((item.quantity + delta) * 1000) / 1000;
    onUpdateQuantity(item.id, next);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    // Only track touch/pen drags — a mouse press shouldn't arm a swipe.
    if (event.pointerType === "mouse") return;
    startXRef.current = event.clientX;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (startXRef.current === null) return;
    // Left-only: swiping right would fight the panel's own scrolling.
    setOffsetX(Math.min(0, event.clientX - startXRef.current));
  }

  function handlePointerEnd() {
    if (startXRef.current === null) return;
    if (offsetX <= -SWIPE_THRESHOLD_PX && item.id !== undefined) {
      onRemove(item.id);
    }
    startXRef.current = null;
    setOffsetX(0);
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {offsetX < 0 && (
        <div
          aria-hidden
          className="absolute inset-y-0 right-0 flex w-24 items-center justify-center rounded-xl bg-error text-on-error"
        >
          <Trash2 size={18} />
        </div>
      )}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        style={{ transform: `translateX(${offsetX}px)` }}
        className="relative flex touch-pan-y items-center gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-2.5 transition-transform dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container text-base font-semibold text-on-surface-variant dark:bg-zinc-800">
          {item.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-on-surface dark:text-zinc-50">
            {item.name}
          </p>
          <p className="text-xs text-on-surface-variant">
            {money(item.unit_price_cents)}
            {item.unit && item.unit !== "unit" ? ` / ${item.unit}` : ""}
          </p>
          <PluginCartRow item={item} />
        </div>

        <div className="flex items-center rounded-lg border border-outline-variant dark:border-zinc-700">
          <button
            type="button"
            aria-label={`Decrease quantity of ${item.name}`}
            onClick={() => changeQuantity(-step)}
            className="flex h-9 w-9 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary dark:hover:text-zinc-50"
          >
            <Minus size={14} />
          </button>
          <span className="min-w-10 text-center text-sm font-medium tabular-nums text-on-surface dark:text-zinc-50">
            {formatQuantity(item.quantity)}
          </span>
          <button
            type="button"
            aria-label={`Increase quantity of ${item.name}`}
            onClick={() => changeQuantity(step)}
            className="flex h-9 w-9 items-center justify-center text-on-surface-variant transition-colors hover:text-on-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary dark:hover:text-zinc-50"
          >
            <Plus size={14} />
          </button>
        </div>

        <span className="w-16 text-right text-sm font-semibold tabular-nums text-on-surface dark:text-zinc-50">
          {money(Math.round(item.unit_price_cents * item.quantity))}
        </span>

        <button
          type="button"
          aria-label={`Remove ${item.name}`}
          onClick={() => item.id !== undefined && onRemove(item.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-outline-variant transition-colors hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:text-zinc-600"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
