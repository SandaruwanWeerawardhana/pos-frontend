import { db } from "./index";
import type { Supplier } from "@/lib/types";

// Local-only table, no server sync yet (no backend endpoint exists).

export async function listSuppliers(): Promise<Supplier[]> {
  return db.suppliers.orderBy("name").toArray();
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  return db.suppliers.get(id);
}

export async function createSupplier(
  input: Omit<Supplier, "id" | "created_at">,
): Promise<Supplier> {
  const supplier: Supplier = {
    ...input,
    id: crypto.randomUUID(),
    created_at: Date.now(),
  };
  await db.suppliers.add(supplier);
  return supplier;
}

export async function updateSupplier(
  id: string,
  changes: Partial<Omit<Supplier, "id" | "created_at">>,
): Promise<void> {
  await db.suppliers.update(id, changes);
}

export async function deleteSupplier(id: string): Promise<void> {
  await db.suppliers.delete(id);
}
