import type { PendingOrder } from "@/lib/types";
import { PluginReceiptExtras } from "@/components/plugin-slots/PluginReceiptExtras";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type ReceiptProps = Readonly<{
  order: PendingOrder;
}>;

export function Receipt({ order }: ReceiptProps) {
  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-center text-base font-semibold text-zinc-900 dark:text-zinc-50">
        POS Receipt
      </p>
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        {new Date(order.created_at).toLocaleString()}
      </p>
      <div className="my-4 flex flex-col gap-1">
        {order.items.map((item, index) => (
          <div key={item.id ?? index}>
            <div className="flex justify-between text-zinc-900 dark:text-zinc-50">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span>{formatCents(item.unit_price_cents * item.quantity)}</span>
            </div>
            <PluginReceiptExtras item={item} />
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-zinc-300 pt-2 dark:border-zinc-700">
        {order.discount_cents ? (
          <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
            <span>Discount</span>
            <span>-{formatCents(order.discount_cents)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
          <span>Tax</span>
          <span>{formatCents(order.tax_total_cents)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-zinc-900 dark:text-zinc-50">
          <span>Total</span>
          <span>{formatCents(order.total_cents)}</span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs uppercase text-zinc-400">
        Paid by {order.payment_method}
      </p>
      {order.refunded && (
        <p className="mt-2 text-center text-xs font-semibold text-red-600">
          REFUNDED
        </p>
      )}
    </div>
  );
}
