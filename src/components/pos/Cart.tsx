"use client";

import { CartItem } from "./CartItem";
import { DiscountInput } from "./DiscountInput";
import { Button } from "@/components/ui/Button";
import type { CartItem as CartItemType, CartTotal, Discount } from "@/lib/types";

interface CartProps {
  items: CartItemType[];
  total: CartTotal;
  selectedDiscount: Discount | null;
  onSelectDiscount: (discount: Discount | null) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  onHold: () => void;
  onPay: () => void;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function Cart({
  items,
  total,
  selectedDiscount,
  onSelectDiscount,
  onUpdateQuantity,
  onRemove,
  onHold,
  onPay,
}: CartProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Cart is empty.
          </p>
        ) : (
          items.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={onUpdateQuantity}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <DiscountInput
          selectedId={selectedDiscount?.id ?? null}
          onSelect={onSelectDiscount}
        />
        <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>Subtotal</span>
          <span>{formatCents(total.subtotal_cents)}</span>
        </div>
        <div className="flex justify-between text-sm text-zinc-600 dark:text-zinc-400">
          <span>Tax</span>
          <span>{formatCents(total.tax_total_cents)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <span>Total</span>
          <span>{formatCents(total.total_cents)}</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onHold}
            disabled={items.length === 0}
          >
            Hold
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={onPay}
            disabled={items.length === 0}
          >
            Pay
          </Button>
        </div>
      </div>
    </div>
  );
}
