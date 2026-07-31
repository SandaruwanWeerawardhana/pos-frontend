"use client";

import { useQuery } from "@tanstack/react-query";
import { listCategories } from "@/lib/db";

export interface CatalogueOptions {
  categories: string[];
  loading: boolean;
}

const STALE_MS = 30_000;

/**
 * Derived from the local Dexie tables, so it is cheap and offline-safe. React
 * Query is used for the shared cache and the `loading` flag the form's skeleton
 * keys off — not for network state.
 *
 * Only the category list is fetched: it is the one catalogue lookup the product
 * form has a control for. Suppliers, warehouses, subcategories and branches
 * were fetched here too, feeding comboboxes that no section rendered.
 */
export function useProductCatalogueOptions(): CatalogueOptions {
  const categories = useQuery({
    queryKey: ["product-options", "categories"],
    queryFn: listCategories,
    staleTime: STALE_MS,
  });

  return {
    categories: categories.data ?? [],
    loading: categories.isPending,
  };
}
