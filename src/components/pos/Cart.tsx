"use client";

import { ShoppingCart, UserPlus, X } from "lucide-react";
import { CartItem } from "./CartItem";
import { DiscountInput } from "./DiscountInput";
import { useSettings } from "@/lib/hooks/use-settings";
import { formatQuantity } from "@/lib/format";
import type {
  CartItem as CartItemType,
  CartTotal,
  Customer,
  Discount,
  PaymentMethod,
} from "@/lib/types";

interface CartProps {
  items: CartItemType[];
  total: CartTotal;
  discountCents: number;
  selectedDiscount: Discount | null;
  customer: Customer | null;
  onSelectDiscount: (discount: Discount | null) => void;
  onOpenCustomer: () => void;
  onClearCustomer: () => void;
  onUpdateQuantity: (id: number, quantity: number) => void;
  onRemove: (id: number) => void;
  onHold: () => void;
  onPay: (method: PaymentMethod) => void;
}

const DEFAULT_PAYMENT_METHOD: PaymentMethod = "cash";

export function Cart({
  items,
  total,
  discountCents,
  selectedDiscount,
  customer,
  onSelectDiscount,
  onOpenCustomer,
  onClearCustomer,
  onUpdateQuantity,
  onRemove,
  onHold,
  onPay,
}: Readonly<CartProps>) {
  const { money } = useSettings();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const empty = items.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-on-surface dark:text-zinc-50">
          <ShoppingCart size={15} aria-hidden />
          Cart
          <span className="font-normal text-on-surface-variant">
            ({formatQuantity(itemCount)} items)
          </span>
        </h2>
        <button
          type="button"
          onClick={onHold}
          disabled={empty}
          className="rounded px-1 text-xs font-medium text-secondary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:text-zinc-300 dark:disabled:text-zinc-600"
        >
          Hold
        </button>
      </div>

      {/* Customer attachment drives loyalty accrual and purchase history. */}
      {customer ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-on-surface dark:text-zinc-100">
              {customer.name}
            </span>
            <span className="block text-[11px] text-on-surface-variant dark:text-zinc-400">
              {customer.loyalty_points ?? 0} points
            </span>
          </span>
          <button
            type="button"
            onClick={onClearCustomer}
            aria-label="Detach customer"
            className="rounded p-1 text-on-surface-variant hover:text-error"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onOpenCustomer}
          className="mb-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-outline-variant py-2 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-zinc-700 dark:text-zinc-400"
        >
          <UserPlus size={14} aria-hidden />
          Attach customer
        </button>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {empty ? (
          <p className="py-10 text-center text-sm text-on-surface-variant">
            Cart is empty. Scan a barcode or tap a product to start.
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
          subtotalCents={total.subtotal_cents + discountCents}
          onSelect={onSelectDiscount}
        />
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <Row label="Items" value={formatQuantity(itemCount)} />
          <Row label="Subtotal" value={money(total.subtotal_cents)} />
          <Row
            label="Discount"
            value={discountCents > 0 ? `-${money(discountCents)}` : money(0)}
            valueClass={discountCents > 0 ? "text-error" : undefined}
          />
          <Row label="Tax" value={money(total.tax_total_cents)} />
        </div>
        <div className="flex items-center justify-between border-t border-outline-variant pt-2 dark:border-zinc-800">
          <span className="text-base font-semibold text-on-surface dark:text-zinc-50">
            Grand Total
          </span>
          <span className="text-2xl font-bold tabular-nums text-on-surface dark:text-zinc-50">
            {money(total.total_cents)}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={empty}
        onClick={() => onPay(DEFAULT_PAYMENT_METHOD)}
        className="mt-3 min-h-14 rounded-xl bg-secondary px-2 text-base font-semibold text-on-secondary transition-colors hover:bg-secondary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        Pay {money(total.total_cents)}
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
