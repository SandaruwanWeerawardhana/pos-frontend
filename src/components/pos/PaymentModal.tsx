"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { PaymentMethod } from "@/lib/types";

interface PaymentModalProps {
  open: boolean;
  totalCents: number;
  initialMethod?: PaymentMethod;
  onClose: () => void;
  onConfirm: (method: PaymentMethod) => void;
  submitting?: boolean;
}

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "card", label: "Card" },
  { key: "other", label: "Other" },
];

export function PaymentModal({
  open,
  totalCents,
  initialMethod = "cash",
  onClose,
  onConfirm,
  submitting,
}: Readonly<PaymentModalProps>) {
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the selected method each time the modal opens, without an effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setMethod(initialMethod);
  }

  return (
    <Modal open={open} onClose={onClose} title="Take payment" glass>
      <p className="mb-4 text-2xl font-semibold text-on-surface dark:text-zinc-50">
        ${(totalCents / 100).toFixed(2)}
      </p>
      <div className="mb-4 flex gap-2">
        {METHODS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setMethod(option.key)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
              method === option.key
                ? "border-primary bg-primary text-on-primary dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-outline-variant text-on-surface-variant dark:border-zinc-700 dark:text-zinc-300"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <Button
        type="button"
        className="w-full"
        onClick={() => onConfirm(method)}
        disabled={submitting}
      >
        {submitting ? "Processing…" : "Confirm payment"}
      </Button>
    </Modal>
  );
}
