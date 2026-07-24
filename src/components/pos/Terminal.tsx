"use client";

import { useState } from "react";
import { ProductSearch } from "./ProductSearch";
import { ProductGrid } from "./ProductGrid";
import { Cart } from "./Cart";
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
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(
    null,
  );
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<PendingOrder | null>(
    null,
  );

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
    const match = matches.find((product) => product.barcode === code) ?? matches[0];
    if (match) {
      await handleAdd(match);
      showToast(`Added ${match.name}`, "success");
    } else {
      showToast(`No product found for barcode ${code}`, "error");
    }
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
    <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <ProductSearch onResults={setResults} />
          </div>
          <BarcodeScanner onScan={handleBarcodeScan} />
        </div>
        {activePlugin?.computeAddQuantity && <ScaleDisplay />}
        <ProductGrid products={results} onAdd={handleAdd} />
      </div>

      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Cart
          </h2>
          <button
            type="button"
            onClick={() => setHoldOpen(true)}
            className="text-xs text-zinc-500 hover:underline dark:text-zinc-400"
          >
            Held carts
          </button>
        </div>
        <Cart
          items={cart.items}
          total={total}
          selectedDiscount={selectedDiscount}
          onSelectDiscount={setSelectedDiscount}
          onUpdateQuantity={cart.updateQuantity}
          onRemove={cart.remove}
          onHold={() => setHoldOpen(true)}
          onPay={() => setPaymentOpen(true)}
        />
      </div>

      <PaymentModal
        open={paymentOpen}
        totalCents={total.total_cents}
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
