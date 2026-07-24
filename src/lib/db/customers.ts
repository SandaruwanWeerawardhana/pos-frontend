import { db } from "./index";
import type { Customer } from "@/lib/types";

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
