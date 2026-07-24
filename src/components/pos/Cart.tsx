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

const PAYMENT_BUTTONS: {
  label: string;
  method: PaymentMethod;
  className: string;
}[] = [
  { label: "Cash", method: "cash", className: "bg-emerald-500 hover:bg-emerald-600" },
  { label: "Card", method: "card", className: "bg-blue-600 hover:bg-blue-700" },
  { label: "QR Pay", method: "other", className: "bg-violet-500 hover:bg-violet-600" },
];

const SECONDARY_PAYMENT: {
  label: string;
  method: PaymentMethod;
  className: string;
}[] = [
  { label: "Bank Transfer", method: "other", className: "bg-slate-500 hover:bg-slate-600" },
  { label: "Gift Voucher", method: "other", className: "bg-orange-400 hover:bg-orange-500" },
];

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
      {/* Customer card */}
      <div className="mb-3 flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-50 to-violet-50 p-3 dark:from-blue-950/40 dark:to-violet-950/40">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
          WI
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Walk-in Customer
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            No loyalty account
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-zinc-200 bg-white p-2 text-zinc-500 hover:text-blue-600 dark:border-zinc-700 dark:bg-zinc-800"
          aria-label="Find customer"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4-4" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Cart{" "}
          <span className="font-normal text-zinc-400">({itemCount} items)</span>
        </h2>
        <button
          type="button"
          onClick={onHold}
          disabled={empty}
          className="text-xs font-medium text-blue-600 hover:underline disabled:text-zinc-300 dark:disabled:text-zinc-600"
        >
          Hold
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto">
        {empty ? (
          <p className="py-10 text-center text-sm text-zinc-400">
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
      <div className="mt-3 space-y-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
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
            valueClass={discountCents > 0 ? "text-red-500" : undefined}
          />
          <Row label="Tax" value={formatCents(total.tax_total_cents)} />
        </div>
        <div className="flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            Grand Total
          </span>
          <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            {formatCents(total.total_cents)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-500">
          <span>Balance</span>
          <span className="font-semibold text-blue-600">
            {formatCents(total.total_cents)}
          </span>
        </div>
      </div>

      {/* Payment buttons */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {PAYMENT_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            type="button"
            disabled={empty}
            onClick={() => onPay(btn.method)}
            className={`rounded-xl px-2 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${btn.className}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {SECONDARY_PAYMENT.map((btn) => (
          <button
            key={btn.label}
            type="button"
            disabled={empty}
            onClick={() => onPay(btn.method)}
            className={`rounded-xl px-2 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${btn.className}`}
          >
            {btn.label}
          </button>
        ))}
      </div>
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
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <span
        className={`font-medium tabular-nums text-zinc-900 dark:text-zinc-50 ${valueClass ?? ""}`}
      >
        {value}
      </span>
    </div>
  );
}
