import { db } from "./index";
import type { Customer, CustomerLedgerEntry, LedgerKind } from "@/lib/types";

// Local-only table, no server sync yet (no backend endpoint exists).

export async function listCustomers(): Promise<Customer[]> {
  return db.customers.orderBy("name").toArray();
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return db.customers.get(id);
}

export async function createCustomer(
  input: Omit<Customer, "id" | "created_at">,
): Promise<Customer> {
  const customer: Customer = {
    ...input,
    id: crypto.randomUUID(),
    created_at: Date.now(),
  };
  await db.customers.add(customer);
  return customer;
}

export async function updateCustomer(
  id: string,
  changes: Partial<Omit<Customer, "id" | "created_at">>,
): Promise<void> {
  await db.customers.update(id, changes);
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.customers.delete(id);
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return listCustomers();
  return db.customers
    .filter(
      (customer) =>
        customer.name.toLowerCase().includes(needle) ||
        (customer.phone ?? "").includes(needle) ||
        (customer.email ?? "").toLowerCase().includes(needle),
    )
    .toArray();
}

export async function listCustomerLedger(
  customerId: string,
  kind?: LedgerKind,
): Promise<CustomerLedgerEntry[]> {
  const entries = await db.customerLedger
    .where("customer_id")
    .equals(customerId)
    .toArray();
  return entries
    .filter((entry) => !kind || entry.kind === kind)
    .sort((a, b) => b.created_at - a.created_at);
}

// Balance and ledger are written together so a redeemed point or settled
// credit can never appear on one and not the other.
async function applyLedgerDelta(input: {
  customerId: string;
  kind: LedgerKind;
  delta: number;
  reason: string;
  orderId?: string;
}): Promise<void> {
  await db.transaction("rw", db.customers, db.customerLedger, async () => {
    const customer = await db.customers.get(input.customerId);
    if (!customer) throw new Error("Customer not found");

    if (input.kind === "loyalty") {
      const next = (customer.loyalty_points ?? 0) + input.delta;
      if (next < 0) throw new Error("Not enough loyalty points");
      await db.customers.update(input.customerId, { loyalty_points: next });
    } else {
      const next = (customer.credit_balance_cents ?? 0) + input.delta;
      if (next < 0) throw new Error("Credit balance cannot go negative");
      const limit = customer.credit_limit_cents ?? 0;
      if (input.delta > 0 && next > limit) {
        throw new Error("Charge would exceed the customer's credit limit");
      }
      await db.customers.update(input.customerId, {
        credit_balance_cents: next,
      });
    }

    await db.customerLedger.add({
      id: crypto.randomUUID(),
      customer_id: input.customerId,
      kind: input.kind,
      delta: input.delta,
      reason: input.reason,
      created_at: Date.now(),
      ...(input.orderId ? { order_id: input.orderId } : {}),
    });
  });
}

export async function adjustLoyaltyPoints(
  customerId: string,
  delta: number,
  reason: string,
): Promise<void> {
  await applyLedgerDelta({ customerId, kind: "loyalty", delta, reason });
}

// Positive delta puts the customer further into debt (a credit sale);
// negative delta records a repayment.
export async function adjustCustomerCredit(
  customerId: string,
  deltaCents: number,
  reason: string,
): Promise<void> {
  await applyLedgerDelta({
    customerId,
    kind: "credit",
    delta: deltaCents,
    reason,
  });
}
