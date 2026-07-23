// Shared domain types. Money is ALWAYS integer cents — never floats.

export type UUID = string;

export type PaymentMethod = "cash" | "card" | "other";

export type OrderStatus = "open" | "completed" | "voided";

export type SyncStatus = "pending" | "syncing" | "synced" | "error";

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
  product_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number; // integer cents
}

export interface Order {
  client_generated_id: UUID;
  items: CartItem[];
  total_cents: number; // integer cents
  tax_total_cents: number; // integer cents
  payment_method: PaymentMethod;
  status: OrderStatus;
  created_at: number; // epoch milliseconds
  sync_status: SyncStatus;
}
