"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ensureDefaultWarehouse,
  listBrands,
  listCategories,
  listShelfLocations,
  listSubcategories,
  listWarehouses,
} from "@/lib/db";
import type { Warehouse } from "@/lib/types";

export interface CatalogueOptions {
  categories: string[];
  subcategories: string[];
  brands: string[];
  warehouses: Warehouse[];
  /** Rack/shelf references already used, for the location typeahead. */
  locations: string[];
  loading: boolean;
}

const STALE_MS = 30_000;

/**
 * Derived from the local Dexie tables, so it is cheap and offline-safe. React
 * Query is used for the shared cache and the `loading` flag the form's skeleton
 * keys off — not for network state.
 *
 * Every list here is rendered by a control on the product form. The warehouse
 * query seeds a default first, so Opening stock and Internal location always
 * have at least one column to draw on a fresh install.
 */
export function useProductCatalogueOptions(): CatalogueOptions {
  const categories = useQuery({
    queryKey: ["product-options", "categories"],
    queryFn: listCategories,
    staleTime: STALE_MS,
  });

  const subcategories = useQuery({
    queryKey: ["product-options", "subcategories"],
    queryFn: () => listSubcategories(),
    staleTime: STALE_MS,
  });

  const brands = useQuery({
    queryKey: ["product-options", "brands"],
    queryFn: listBrands,
    staleTime: STALE_MS,
  });

  const warehouses = useQuery({
    queryKey: ["product-options", "warehouses"],
    queryFn: async () => {
      await ensureDefaultWarehouse();
      return listWarehouses();
    },
    staleTime: STALE_MS,
  });

  const locations = useQuery({
    queryKey: ["product-options", "locations"],
    queryFn: listShelfLocations,
    staleTime: STALE_MS,
  });

  return {
    categories: categories.data ?? [],
    subcategories: subcategories.data ?? [],
    brands: brands.data ?? [],
    warehouses: warehouses.data ?? [],
    locations: locations.data ?? [],
    loading:
      categories.isPending ||
      subcategories.isPending ||
      brands.isPending ||
      warehouses.isPending ||
      locations.isPending,
  };
}
