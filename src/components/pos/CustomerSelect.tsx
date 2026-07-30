"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createCustomer, searchCustomers } from "@/lib/db";
import type { Customer } from "@/lib/types";

interface CustomerSelectProps {
  open: boolean;
  selected: Customer | null;
  onClose: () => void;
  onSelect: (customer: Customer | null) => void;
}

// Attaches a customer to the sale in progress, so the order carries loyalty
// accrual and shows up in that customer's purchase history.
export function CustomerSelect({
  open,
  selected,
  onClose,
  onSelect,
}: Readonly<CustomerSelectProps>) {
  const [query, setQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const timeout = window.setTimeout(() => {
      searchCustomers(query).then(setCustomers);
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [open, query]);

  useEffect(() => {
    if (open) return;
    setQuery("");
    setCreating(false);
    setNewName("");
    setNewPhone("");
    setError("");
  }, [open]);

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const customer = await createCustomer({
        name: newName.trim(),
        ...(newPhone.trim() ? { phone: newPhone.trim() } : {}),
        loyalty_points: 0,
        membership_tier: "none",
      });
      onSelect(customer);
      onClose();
    } catch {
      setError("Couldn't save that customer. Try again.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Attach customer" size="md">
      {selected && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 px-3 py-2.5">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-on-surface dark:text-zinc-50">
              {selected.name}
            </span>
            <span className="block text-xs text-on-surface-variant dark:text-zinc-400">
              {selected.loyalty_points ?? 0} points
            </span>
          </span>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-error hover:bg-error/10"
          >
            <X size={13} />
            Detach
          </button>
        </div>
      )}

      {creating ? (
        <div className="flex flex-col gap-3">
          <Input
            label="Name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
            autoFocus
          />
          <Input
            label="Phone"
            value={newPhone}
            onChange={(event) => setNewPhone(event.target.value)}
            error={error}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreating(false)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              Save and attach
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, phone, or email…"
            autoFocus
          />
          <ul className="max-h-64 overflow-y-auto">
            {customers.length === 0 && (
              <li className="py-6 text-center text-sm text-on-surface-variant dark:text-zinc-400">
                No matching customers.
              </li>
            )}
            {customers.map((customer) => (
              <li key={customer.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(customer);
                    onClose();
                  }}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-container dark:hover:bg-zinc-800"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-on-surface dark:text-zinc-100">
                      {customer.name}
                    </span>
                    <span className="block truncate text-xs text-on-surface-variant dark:text-zinc-400">
                      {customer.phone ?? customer.email ?? "No contact details"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-primary dark:text-blue-400">
                    {customer.loyalty_points ?? 0} pts
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="outline" onClick={() => setCreating(true)}>
            <UserPlus size={16} />
            New customer
          </Button>
        </div>
      )}
    </Modal>
  );
}
