// Shared domain types. Money is ALWAYS integer cents — never floats.

export type PaymentMethod = "cash" | "card" | "other";

export type SyncStatus = "pending" | "syncing" | "synced" | "conflict" | "error";

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price_cents: number; // integer cents
  tax_rate: number; // fractional rate, e.g. 0.08 = 8%
  stock_quantity: number;
}

export interface CartItem {
  id?: number; // Dexie auto-increment pk; present once persisted
  product_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number; // integer cents
  tax_rate: number; // captured from the product at add-to-cart time, not re-fetched
}

export interface PendingOrder {
  client_generated_id: string;
  items: CartItem[];
  total_cents: number; // integer cents
  tax_total_cents: number; // integer cents
  payment_method: PaymentMethod;
  created_at: number; // epoch milliseconds
  sync_status: SyncStatus;
  server_id: string | null;
  customer_id?: string;
  discount_cents?: number; // integer cents, applied before tax
  refunded?: boolean; // local-only annotation, not synced (no backend refund endpoint yet)
}

export interface SyncMetaRecord {
  key: string;
  value: unknown;
}

export interface CartTotal {
  subtotal_cents: number;
  tax_total_cents: number;
  total_cents: number;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  created_at: number;
}

export type DiscountType = "percentage" | "fixed_cents";

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  value: number; // percentage (0-100) or integer cents, depending on type
  active: boolean;
  created_at: number;
}

export interface HeldCart {
  id: string;
  label: string;
  items: CartItem[];
  created_at: number;
}

export interface CashReconciliation {
  id: string;
  expected_cents: number;
  counted_cents: number;
  difference_cents: number;
  notes?: string;
  created_at: number;
}

export * from "./plugin";
export * from "./hardware";
