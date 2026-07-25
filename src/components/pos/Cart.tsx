"use client";

import { CartItem } from "./CartItem";
import { DiscountInput } from "./DiscountInput";
import type {
  CartItem as CartItemType,
  CartTotal,
  Discount,
  PaymentMethod,
} from "@/lib/types";

interface CartProps {
  items: CartItemType[];
  total: CartTotal;
  discountCents: number;
  selectedDiscount: Discount | null;
  onSelectDiscount: (discount: Discount | null) => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  onHold: () => void;
  onPay: (method: PaymentMethod) => void;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

const DEFAULT_PAYMENT_METHOD: PaymentMethod = "cash";

export function Cart({
  items,
  total,
  discountCents,
  selectedDiscount,
  onSelectDiscount,
  onUpdateQuantity,
  onRemove,
  onHold,
  onPay,
}: Readonly<CartProps>) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const empty = items.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-on-surface dark:text-zinc-50">
          Cart{" "}
          <span className="font-normal text-on-surface-variant">({itemCount} items)</span>
        </h2>
        <button
          type="button"
          onClick={onHold}
          disabled={empty}
          className="text-xs font-medium text-secondary hover:underline disabled:text-zinc-300 dark:disabled:text-zinc-600"
        >
          Hold
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {empty ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">
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

      {/* Totals */}
      <div className="mt-3 space-y-2 border-t border-outline-variant pt-3 dark:border-zinc-800">
        <DiscountInput
          selectedId={selectedDiscount?.id ?? null}
          onSelect={onSelectDiscount}
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <Row label="Items" value={String(itemCount)} />
          <Row label="Subtotal" value={formatCents(total.subtotal_cents)} />
          <Row
            label="Discount"
            value={discountCents > 0 ? `-${formatCents(discountCents)}` : "$0.00"}
            valueClass={discountCents > 0 ? "text-error" : undefined}
          />
          <Row label="Tax" value={formatCents(total.tax_total_cents)} />
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant pt-2 dark:border-zinc-800">
          <span className="text-base font-semibold text-on-surface dark:text-zinc-50">
            Grand Total
          </span>
          <span className="text-headline-lg text-on-surface dark:text-zinc-50">
            {formatCents(total.total_cents)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-on-surface-variant">
          <span>Balance</span>
          <span className="font-semibold text-secondary">
            {formatCents(total.total_cents)}
          </span>
        </div>
      </div>

      {/* Pay */}
      <button
        type="button"
        disabled={empty}
        onClick={() => onPay(DEFAULT_PAYMENT_METHOD)}
        className="mt-3 rounded-xl bg-secondary px-2 py-3 text-sm font-semibold text-on-secondary transition-colors hover:bg-secondary/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Pay Now
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: Readonly<{ label: string; value: string; valueClass?: string }>) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant dark:text-zinc-400">{label}</span>
      <span
        className={`font-medium tabular-nums text-on-surface dark:text-zinc-50 ${valueClass ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}
