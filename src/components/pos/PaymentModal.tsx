"use client";

import { useState } from "react";
import { Banknote, CreditCard, Plus, QrCode, Trash2, Wallet } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { NumPad } from "./NumPad";
import { useSettings } from "@/lib/hooks/use-settings";
import { parseMoneyToCents } from "@/lib/format";
import type { PaymentMethod, PaymentSplit } from "@/lib/types";

interface PaymentModalProps {
  open: boolean;
  totalCents: number;
  initialMethod?: PaymentMethod;
  onClose: () => void;
  onConfirm: (method: PaymentMethod, splits: PaymentSplit[]) => void;
  submitting?: boolean;
}

const METHODS: { key: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "qr", label: "QR / Wallet", icon: QrCode },
  { key: "other", label: "Other", icon: Wallet },
];

// Denominations offered as one-tap "the customer handed me this note" buttons.
const QUICK_CASH_CENTS = [500, 1000, 2000, 5000, 10000];

export function PaymentModal({
  open,
  totalCents,
  initialMethod = "cash",
  onClose,
  onConfirm,
  submitting,
}: Readonly<PaymentModalProps>) {
  const { money } = useSettings();
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [entry, setEntry] = useState("");
  const [splits, setSplits] = useState<PaymentSplit[]>([]);
  const [reference, setReference] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  // Reset each time the modal opens, without an effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMethod(initialMethod);
      setEntry("");
      setSplits([]);
      setReference("");
    }
  }

  const settledCents = splits.reduce((sum, split) => sum + split.amount_cents, 0);
  const remainingCents = Math.max(0, totalCents - settledCents);
  const entryCents = parseMoneyToCents(entry) ?? 0;

  // An empty keypad means "settle the whole remaining balance". Anything typed
  // above the balance is change, not an amount to record against the sale.
  const appliedCents = Math.min(entryCents || remainingCents, remainingCents);
  const changeCents =
    method === "cash" && entryCents > appliedCents ? entryCents - appliedCents : 0;

  const isFullySettled = remainingCents === 0 && splits.length > 0;
  const canAddTender = remainingCents > 0 && appliedCents > 0;

  function buildSplit(): PaymentSplit {
    return {
      method,
      amount_cents: appliedCents,
      ...(method === "cash" && entryCents > 0
        ? { tendered_cents: entryCents, change_cents: changeCents }
        : {}),
      ...(reference.trim() ? { reference: reference.trim() } : {}),
    };
  }

  function handleAddTender() {
    if (!canAddTender) return;
    setSplits((current) => [...current, buildSplit()]);
    setEntry("");
    setReference("");
  }

  function handleRemoveSplit(index: number) {
    setSplits((current) => current.filter((_, position) => position !== index));
  }

  function handleConfirm() {
    // A single-tender sale shouldn't force the cashier through "Add tender"
    // first, so the in-progress entry is folded in at confirm time.
    const finalSplits = isFullySettled ? splits : [...splits, buildSplit()];
    const primary = finalSplits[0]?.method ?? method;
    onConfirm(primary, finalSplits);
  }

  const confirmDisabled = submitting || (!isFullySettled && appliedCents <= 0);

  return (
    <Modal open={open} onClose={onClose} title="Take payment" size="lg" glass>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-outline-variant p-4 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500">
              Amount due
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-on-surface dark:text-zinc-50">
              {money(remainingCents)}
            </p>
            {splits.length > 0 && (
              <p className="mt-1 text-xs text-on-surface-variant dark:text-zinc-400">
                {money(settledCents)} of {money(totalCents)} settled
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500">
              Payment method
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {METHODS.map((option) => {
                const Icon = option.icon;
                const active = method === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMethod(option.key)}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                      active
                        ? "border-primary bg-primary text-on-primary dark:border-white dark:bg-white dark:text-zinc-900"
                        : "border-outline-variant text-on-surface-variant hover:bg-surface-container dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    <Icon size={16} aria-hidden />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {method === "cash" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setEntry((remainingCents / 100).toFixed(2))}
                className="min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
              >
                Exact
              </button>
              {QUICK_CASH_CENTS.filter((amount) => amount >= remainingCents).map(
                (amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setEntry((amount / 100).toFixed(2))}
                    className="min-h-10 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {money(amount)}
                  </button>
                ),
              )}
            </div>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-on-surface-variant dark:text-zinc-300">
                Reference (auth code / transaction id)
              </span>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Optional"
                className="min-h-11 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-sm text-on-surface outline-none focus:border-secondary focus:ring-2 focus:ring-primary/40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </label>
          )}

          {splits.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant dark:text-zinc-500">
                Tenders
              </p>
              <ul className="flex flex-col gap-1.5">
                {splits.map((split, index) => (
                  <li
                    key={`${split.method}-${index}-${split.amount_cents}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant px-3 py-2 text-sm dark:border-zinc-800"
                  >
                    <span className="capitalize text-on-surface dark:text-zinc-100">
                      {split.method}
                      {split.reference ? ` · ${split.reference}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold tabular-nums text-on-surface dark:text-zinc-50">
                        {money(split.amount_cents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(index)}
                        aria-label={`Remove ${split.method} tender`}
                        className="rounded p-1 text-on-surface-variant transition-colors hover:text-error"
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <NumPad
            value={entry}
            onChange={setEntry}
            disabled={submitting || isFullySettled}
          />

          {changeCents > 0 && (
            <p
              role="status"
              className="rounded-xl bg-[#004b1e] px-4 py-3 text-center text-sm font-semibold text-[#bbf7d0] dark:bg-green-900/40 dark:text-green-300"
            >
              Change due {money(changeCents)}
            </p>
          )}

          {remainingCents > 0 && (
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={handleAddTender}
              disabled={!canAddTender || appliedCents >= remainingCents}
            >
              <Plus size={16} />
              Add as split tender
            </Button>
          )}

          <Button
            type="button"
            size="lg"
            fullWidth
            onClick={handleConfirm}
            disabled={confirmDisabled}
          >
            {submitting ? "Processing…" : `Confirm ${money(totalCents)}`}
          </Button>
          <p className="text-center text-xs text-on-surface-variant dark:text-zinc-500">
            {isFullySettled
              ? "All tenders cover the balance."
              : "Leave the keypad empty to settle the full remaining balance."}
          </p>
        </div>
      </div>
    </Modal>
  );
}
