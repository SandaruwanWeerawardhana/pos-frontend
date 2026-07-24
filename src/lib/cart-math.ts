import type { CartItem, CartTotal } from "@/lib/types";

// Subtotal, tax, and grand total in integer cents. Tax is rounded per line
// item to avoid float drift. discountCents, if given, reduces the taxable
// subtotal (tax is reduced proportionally) before totaling. Shared between
// src/lib/db (persisted totals) and UI code that needs a synchronous preview
// (e.g. the POS terminal previewing a discount before checkout).
export function computeCartTotal(items: CartItem[], discountCents = 0): CartTotal {
  const rawSubtotalCents = items.reduce(
    (sum, item) => sum + item.unit_price_cents * item.quantity,
    0,
  );
  const rawTaxCents = items.reduce(
    (sum, item) =>
      sum + Math.round(item.unit_price_cents * item.quantity * item.tax_rate),
    0,
  );

  const discount = Math.min(Math.max(discountCents, 0), rawSubtotalCents);
  const discountRatio = rawSubtotalCents > 0 ? discount / rawSubtotalCents : 0;

  const subtotal_cents = rawSubtotalCents - discount;
  const tax_total_cents = Math.round(rawTaxCents * (1 - discountRatio));

  return {
    subtotal_cents,
    tax_total_cents,
    total_cents: subtotal_cents + tax_total_cents,
  };
}
