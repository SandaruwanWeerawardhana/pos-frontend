"use client";

import { useState, useSyncExternalStore } from "react";
import { ProductSearch } from "./ProductSearch";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
import { CategorySidebar } from "./CategorySidebar";
import { QuickActions } from "./QuickActions";
import { PaymentModal } from "./PaymentModal";
import { HoldModal } from "./HoldModal";
import { Receipt } from "./Receipt";
import { BarcodeScanner } from "@/components/hardware/BarcodeScanner";
import { ScaleDisplay } from "@/components/hardware/ScaleDisplay";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/hooks/use-cart";
import { useScale } from "@/lib/hooks/use-scale";
import { usePlugin } from "@/lib/hooks/use-plugin";
import { useToast } from "@/components/ui/Toast";
import { createLocalOrder, searchProducts } from "@/lib/db";
import type {
  Discount,
  PaymentMethod,
  PendingOrder,
  Product,
} from "@/lib/types";

const emptySubscribe = () => () => {};

// True only after client hydration; false during SSR and the first client
// render. Lets us gate localStorage-backed (persisted) UI without a mismatch.
function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function computeDiscountCents(
  discount: Discount | null,
  subtotalCents: number,
): number {
  if (!discount) return 0;
  if (discount.type === "fixed_cents") return discount.value;
  return Math.round((subtotalCents * discount.value) / 100);
}

export function Terminal() {
  const [results, setResults] = useState<Product[]>([]);
  const [category, setCategory] = useState("all");
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(
    null,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [holdOpen, setHoldOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<PendingOrder | null>(
    null,
  );

  // Persisted plugin store rehydrates from localStorage on the client only, so
  // gate plugin-dependent UI until after mount to keep the first client render
  // identical to the server render (no hydration mismatch).
  const mounted = useHydrated();

  const cart = useCart();
  const { reading } = useScale();
  const { active: activePlugin } = usePlugin();
  const { showToast } = useToast();

  const previewSubtotal = cart.computeTotal(0).subtotal_cents;
  const discountCents = computeDiscountCents(selectedDiscount, previewSubtotal);
  const total = cart.computeTotal(discountCents);

  async function handleAdd(product: Product) {
    const quantity = activePlugin?.computeAddQuantity
      ? activePlugin.computeAddQuantity({ product, scaleReading: reading })
      : 1;
    await cart.add(product, quantity);
  }

  async function handleBarcodeScan(code: string) {
    const matches = await searchProducts(code);
    const match =
      matches.find((product) => product.barcode === code) ?? matches[0];
    if (match) {
      await handleAdd(match);
      showToast(`Added ${match.name}`, "success");
    } else {
      showToast(`No product found for barcode ${code}`, "error");
    }
  }

  function handlePay(method: PaymentMethod) {
    setPaymentMethod(method);
    setPaymentOpen(true);
  }

  async function handleClearCart() {
    await cart.clear();
    setSelectedDiscount(null);
    showToast("Cart cleared", "success");
  }

  async function handleConfirmPayment(method: PaymentMethod) {
    setSubmitting(true);
    try {
      const order = await createLocalOrder(method, {
        discountCents: discountCents || undefined,
      });
      setCompletedOrder(order);
      setPaymentOpen(false);
      setSelectedDiscount(null);
      showToast("Sale completed", "success");
    } catch {
      showToast("Failed to complete sale", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 gap-4 overflow-hidden bg-zinc-50 p-4 dark:bg-zinc-950">
      <CategorySidebar
        totalCount={results.length}
        active={category}
        onSelect={setCategory}
      />

      {/* Product area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <ProductSearch onResults={setResults} />
          </div>
          <BarcodeScanner onScan={handleBarcodeScan} />
        </div>

        {mounted && activePlugin?.computeAddQuantity && <ScaleDisplay />}

        <div className="flex-1 overflow-y-auto">
          <ProductGrid products={results} onAdd={handleAdd} />
        </div>

        <QuickActions
          onHold={() => setHoldOpen(true)}
          onRecall={() => setHoldOpen(true)}
          onClear={handleClearCart}
          onNotImplemented={(label) =>
            showToast(`${label} — not implemented yet`, "error")
          }
          disabled={cart.items.length === 0}
        />
      </div>

      {/* Checkout panel */}
      <div
        suppressHydrationWarning
        className="hidden h-full min-h-0 w-[360px] shrink-0 flex-col rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex"
      >
        <Cart
          items={cart.items}
          total={total}
          discountCents={discountCents}
          selectedDiscount={selectedDiscount}
          onSelectDiscount={setSelectedDiscount}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.remove}
          onHold={() => setHoldOpen(true)}
          onPay={handlePay}
        />
      </div>

      <PaymentModal
        open={paymentOpen}
        totalCents={total.total_cents}
        initialMethod={paymentMethod}
        onClose={() => setPaymentOpen(false)}
        onConfirm={handleConfirmPayment}
        submitting={submitting}
      />

      <HoldModal
        open={holdOpen}
        onClose={() => setHoldOpen(false)}
        hasItemsInCart={cart.items.length > 0}
        onResumed={() => showToast("Cart resumed", "success")}
      />

      <Modal
        open={completedOrder !== null}
        onClose={() => setCompletedOrder(null)}
        title="Sale complete"
      >
        {completedOrder && (
          <div className="flex flex-col gap-4">
            <Receipt order={completedOrder} />
            <Button
              type="button"
              className="w-full"
              onClick={() => setCompletedOrder(null)}
            >
              New sale
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
