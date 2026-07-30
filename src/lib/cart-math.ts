import type { CartItem, CartTotal, Discount } from "@/lib/types";

// Resolves a discount definition into a cash amount against the current cart.
// Percentage and fixed discounts are basket-level; BOGO and bundle campaigns
// are line-level, so they need the items rather than just the subtotal.
export function computeDiscountCents(
  discount: Discount | null,
  items: CartItem[],
  subtotalCents: number,
): number {
  if (!discount) return 0;

  const scoped = discount.product_ids?.length
    ? items.filter((item) => discount.product_ids!.includes(item.product_id))
    : items;

  switch (discount.type) {
    case "fixed_cents":
      return Math.min(discount.value, subtotalCents);

    case "percentage":
    case "seasonal": {
      const base = discount.product_ids?.length
        ? scoped.reduce(
            (sum, item) => sum + item.unit_price_cents * item.quantity,
            0,
          )
        : subtotalCents;
      return Math.min(Math.round((base * discount.value) / 100), subtotalCents);
    }

    case "bogo": {
      // "Buy N get M free" per qualifying line: every (N+M) units yields M
      // free at that line's unit price. Cheapest-unit-free is the usual
      // supermarket rule, and within a single line every unit costs the same.
      const buy = Math.max(1, discount.buy_quantity ?? 1);
      const get = Math.max(1, discount.get_quantity ?? 1);
      const groupSize = buy + get;
      return scoped.reduce((total, item) => {
        const freeUnits = Math.floor(item.quantity / groupSize) * get;
        return total + freeUnits * item.unit_price_cents;
      }, 0);
    }

    case "bundle":
      // A bundle price is expressed as the amount off when the whole scoped
      // set is present; it does nothing until every listed product is in the
      // basket.
      if (!discount.product_ids?.length) return 0;
      return discount.product_ids.every((id) =>
        items.some((item) => item.product_id === id),
      )
        ? Math.min(discount.value, subtotalCents)
        : 0;

    default:
      return 0;
  }
}

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
