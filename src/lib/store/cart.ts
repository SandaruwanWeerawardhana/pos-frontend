import { create } from "zustand";
import type { CartItem, Product } from "@/lib/types";

interface CartState {
  items: CartItem[];
  addProduct: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  // derived totals, integer cents
  subtotalCents: () => number;
  taxTotalCents: () => number;
  totalCents: () => number;
}

// Tax is derived per-product; the cart stores only line items and looks up
// rates via the product it was added from. Rates are captured at add time.
const rateByProduct = new Map<string, number>();

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addProduct: (product, quantity = 1) => {
    rateByProduct.set(product.id, product.tax_rate);
    set((state) => {
      const existing = state.items.find((i) => i.product_id === product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product_id === product.id
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          ),
        };
      }
      const item: CartItem = {
        product_id: product.id,
        name: product.name,
        quantity,
        unit_price_cents: product.price_cents,
      };
      return { items: [...state.items, item] };
    });
  },

  removeItem: (productId) =>
    set((state) => ({
      items: state.items.filter((i) => i.product_id !== productId),
    })),

  updateQuantity: (productId, quantity) =>
    set((state) => ({
      items:
        quantity <= 0
          ? state.items.filter((i) => i.product_id !== productId)
          : state.items.map((i) =>
              i.product_id === productId ? { ...i, quantity } : i,
            ),
    })),

  clear: () => set({ items: [] }),

  subtotalCents: () =>
    get().items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0),

  taxTotalCents: () =>
    get().items.reduce((sum, i) => {
      const rate = rateByProduct.get(i.product_id) ?? 0;
      // round each line's tax to whole cents to avoid float drift
      return sum + Math.round(i.unit_price_cents * i.quantity * rate);
    }, 0),

  totalCents: () => get().subtotalCents() + get().taxTotalCents(),
}));
