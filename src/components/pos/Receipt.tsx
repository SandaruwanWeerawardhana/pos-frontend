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
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-center text-base font-semibold text-on-surface dark:text-zinc-50">
        POS Receipt
      </p>
      <p className="text-center text-xs text-on-surface-variant dark:text-zinc-400">
        {new Date(order.created_at).toLocaleString()}
      </p>
      <div className="my-4 flex flex-col gap-1">
        {order.items.map((item, index) => (
          <div key={item.id ?? index}>
            <div className="flex justify-between text-on-surface dark:text-zinc-50">
              <span>
                {item.quantity} × {item.name}
              </span>
              <span>{formatCents(item.unit_price_cents * item.quantity)}</span>
            </div>
            <PluginReceiptExtras item={item} />
          </div>
        ))}
      </div>
      <div className="border-t border-dashed border-outline-variant pt-2 dark:border-zinc-700">
        {order.discount_cents ? (
          <div className="flex justify-between text-on-surface-variant dark:text-zinc-400">
            <span>Discount</span>
            <span>-{formatCents(order.discount_cents)}</span>
          </div>
        ) : null}
        <div className="flex justify-between text-on-surface-variant dark:text-zinc-400">
          <span>Tax</span>
          <span>{formatCents(order.tax_total_cents)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-on-surface dark:text-zinc-50">
          <span>Total</span>
          <span>{formatCents(order.total_cents)}</span>
        </div>
      </div>
      <p className="mt-4 text-center text-xs uppercase text-on-surface-variant">
        Paid by {order.payment_method}
      </p>
      {order.refunded && (
        <p className="mt-2 text-center text-xs font-semibold text-error">
          REFUNDED
        </p>
      )}
    </div>
  );
}
