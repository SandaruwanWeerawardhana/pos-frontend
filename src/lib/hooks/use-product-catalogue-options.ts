"use client";

import { useQuery } from "@tanstack/react-query";
import {
  listBranches,
  listBrands,
  listCategories,
  listSubcategories,
  listSuppliers,
  listWarehouses,
} from "@/lib/db";
import type { Supplier, Warehouse } from "@/lib/types";

export interface CatalogueOptions {
  categories: string[];
  subcategories: string[];
  brands: string[];
  branches: string[];
  suppliers: Supplier[];
  warehouses: Warehouse[];
  loading: boolean;
}

// Every list here is derived from the local Dexie tables, so it is cheap and
// offline-safe. React Query is used for the shared cache and the single
// `loading` flag the form's skeleton keys off — not for network state.
const STALE_MS = 30_000;

export function useProductCatalogueOptions(category: string): CatalogueOptions {
  const categories = useQuery({
    queryKey: ["product-options", "categories"],
    queryFn: listCategories,
    staleTime: STALE_MS,
  });
  const subcategories = useQuery({
    queryKey: ["product-options", "subcategories", category],
    queryFn: () => listSubcategories(category || undefined),
    staleTime: STALE_MS,
  });
  const brands = useQuery({
    queryKey: ["product-options", "brands"],
    queryFn: listBrands,
    staleTime: STALE_MS,
  });
  const branches = useQuery({
    queryKey: ["product-options", "branches"],
    queryFn: listBranches,
    staleTime: STALE_MS,
  });
  const suppliers = useQuery({
    queryKey: ["suppliers"],
    queryFn: listSuppliers,
    staleTime: STALE_MS,
  });
  const warehouses = useQuery({
    queryKey: ["warehouses"],
    queryFn: listWarehouses,
    staleTime: STALE_MS,
  });

  return {
    categories: categories.data ?? [],
    subcategories: subcategories.data ?? [],
    brands: brands.data ?? [],
    branches: branches.data ?? [],
    suppliers: suppliers.data ?? [],
    warehouses: warehouses.data ?? [],
    loading:
      categories.isPending ||
      brands.isPending ||
      suppliers.isPending ||
      warehouses.isPending,
  };
}
