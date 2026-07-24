import { db } from "./index";
import type { Discount } from "@/lib/types";

// Local-only table, no server sync yet (no backend endpoint exists).

export async function listDiscounts(): Promise<Discount[]> {
  return db.discounts.toArray();
}

export async function getActiveDiscounts(): Promise<Discount[]> {
  return db.discounts.filter((discount) => discount.active).toArray();
}

export async function getDiscount(id: string): Promise<Discount | undefined> {
  return db.discounts.get(id);
}

export async function createDiscount(
  input: Omit<Discount, "id" | "created_at">,
): Promise<Discount> {
  const discount: Discount = {
    ...input,
    id: crypto.randomUUID(),
    created_at: Date.now(),
  };
  await db.discounts.add(discount);
  return discount;
}

export async function updateDiscount(
  id: string,
  changes: Partial<Omit<Discount, "id" | "created_at">>,
): Promise<void> {
  await db.discounts.update(id, changes);
}

export async function deleteDiscount(id: string): Promise<void> {
  await db.discounts.delete(id);
}
