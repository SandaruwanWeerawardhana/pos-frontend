// Shared domain types. Money is ALWAYS integer cents — never floats.

export type PaymentMethod = "cash" | "card" | "qr" | "other";

export type SyncStatus = "pending" | "syncing" | "synced" | "conflict" | "error";

// How a product's quantity is entered at the till. "unit" products are
// counted (1 tin, 2 loaves); "weight" products are priced per kg and the
// cart quantity carries a fractional weight read from the scale.
export type ProductUnit = "unit" | "kg" | "g" | "l" | "ml" | "pack" | "box";

export interface ProductBatch {
  batch_no: string;
  expiry_date: string | null; // ISO yyyy-mm-dd, null when not perishable
  quantity: number;
  cost_cents?: number; // landed cost for this batch
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  price_cents: number; // integer cents
  tax_rate: number; // fractional rate, e.g. 0.08 = 8%
  stock_quantity: number;
  // ── Grocery catalogue fields (all optional so server payloads that predate
  // them still validate; the UI falls back to sensible defaults). ──
  category?: string;
  brand?: string;
  unit?: ProductUnit;
  cost_cents?: number; // purchase cost, basis for profit margin
  image_url?: string;
  is_weighted?: boolean; // variable-weight item priced per `unit`
  reorder_level?: number; // triggers the low-stock alert for this product
  shelf_location?: string; // e.g. "A3-04"
  supplier_id?: string;
  batches?: ProductBatch[]; // batch/expiry tracking for perishables
  _local_only?: boolean; // locally-created product, preserved until product sync exists
}

export interface CartItem {
  id?: number; // Dexie auto-increment pk; present once persisted
  product_id: string;
  name: string;
  quantity: number; // fractional for weighted items (kg), whole otherwise
  unit_price_cents: number; // integer cents, per `unit`
  tax_rate: number; // captured from the product at add-to-cart time, not re-fetched
  unit?: ProductUnit;
  is_weighted?: boolean;
  line_discount_cents?: number; // per-line override, applied before cart discount
}

// One leg of a payment. A single-tender sale has exactly one; a split sale
// has several whose amounts sum to the order total.
export interface PaymentSplit {
  method: PaymentMethod;
  amount_cents: number;
  tendered_cents?: number; // cash only — what the customer handed over
  change_cents?: number; // cash only — tendered minus amount
  reference?: string; // card auth code / QR transaction id
}

export interface PendingOrder {
  client_generated_id: string;
  items: CartItem[];
  total_cents: number; // integer cents
  tax_total_cents: number; // integer cents
  payment_method: PaymentMethod; // primary tender; see `payments` for splits
  created_at: number; // epoch milliseconds
  sync_status: SyncStatus;
  server_id: string | null;
  customer_id?: string;
  discount_cents?: number; // integer cents, applied before tax
  refunded?: boolean; // local-only annotation, not synced (no backend refund endpoint yet)
  payments?: PaymentSplit[]; // present for every order created after split-payment support
  cashier_id?: string;
  receipt_no?: string;
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

export type MembershipTier = "none" | "silver" | "gold" | "platinum";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_at: number;
  loyalty_points?: number;
  membership_tier?: MembershipTier;
  credit_limit_cents?: number; // 0 / undefined means no credit account
  credit_balance_cents?: number; // outstanding amount the customer owes
}

// Append-only ledger behind `Customer.loyalty_points` and `credit_balance_cents`
// so the balance is always reconstructable and auditable.
export type LedgerKind = "loyalty" | "credit";

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  kind: LedgerKind;
  delta: number; // points for loyalty, integer cents for credit
  reason: string;
  order_id?: string;
  created_at: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  created_at: number;
  address?: string;
  tax_id?: string;
  payment_terms?: string; // e.g. "Net 30"
}

export type DiscountType =
  | "percentage"
  | "fixed_cents"
  | "bogo"
  | "bundle"
  | "seasonal";

export interface Discount {
  id: string;
  name: string;
  type: DiscountType;
  value: number; // percentage (0-100) or integer cents, depending on type
  active: boolean;
  created_at: number;
  starts_at?: number; // epoch ms — campaign window start
  ends_at?: number; // epoch ms — campaign window end
  product_ids?: string[]; // limits the campaign to these products
  buy_quantity?: number; // BOGO: buy N…
  get_quantity?: number; // …get M free
  min_subtotal_cents?: number; // threshold before the campaign applies
}

// ── Inventory ──────────────────────────────────────────────────────────────

export type StockMovementType =
  | "sale"
  | "purchase"
  | "adjustment"
  | "transfer_in"
  | "transfer_out"
  | "waste"
  | "damage"
  | "return";

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: StockMovementType;
  quantity_delta: number; // signed: negative removes stock
  balance_after: number;
  reason?: string;
  reference_id?: string; // order id / purchase order id
  warehouse_id?: string;
  batch_no?: string;
  created_at: number;
  created_by?: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location?: string;
  is_default?: boolean;
  created_at: number;
}

// ── Purchasing ─────────────────────────────────────────────────────────────

export type PurchaseOrderStatus =
  | "draft"
  | "ordered"
  | "partial"
  | "received"
  | "cancelled";

export interface PurchaseOrderLine {
  product_id: string;
  product_name: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost_cents: number;
  batch_no?: string;
  expiry_date?: string | null;
}

export interface PurchaseOrder {
  id: string;
  reference: string; // human-facing PO number
  supplier_id: string;
  supplier_name: string;
  status: PurchaseOrderStatus;
  lines: PurchaseOrderLine[];
  total_cents: number;
  expected_at?: number;
  notes?: string;
  created_at: number;
  received_at?: number;
}

export interface PurchaseReturn {
  id: string;
  purchase_order_id: string;
  supplier_name: string;
  reason: string;
  lines: { product_id: string; product_name: string; quantity: number; unit_cost_cents: number }[];
  total_cents: number;
  created_at: number;
}

// ── Users, roles, permissions ──────────────────────────────────────────────

// Coarse-grained capability strings checked by `hasPermission`. Kept flat
// (rather than resource/action objects) so a role is just a string list.
export const PERMISSIONS = [
  "pos.sell",
  "pos.refund",
  "pos.discount",
  "products.view",
  "products.manage",
  "inventory.view",
  "inventory.adjust",
  "purchases.view",
  "purchases.manage",
  "customers.view",
  "customers.manage",
  "reports.view",
  "settings.manage",
  "users.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  is_system?: boolean; // seeded role, cannot be deleted
  created_at: number;
}

export interface StaffUser {
  id: string;
  name: string;
  email: string;
  role_id: string;
  pin?: string; // till login PIN
  active: boolean;
  created_at: number;
}

// ── Notifications ──────────────────────────────────────────────────────────

export type NotificationKind =
  | "low_stock"
  | "out_of_stock"
  | "expiry"
  | "expired"
  | "sync"
  | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  read: boolean;
  created_at: number;
}

// ── Settings ───────────────────────────────────────────────────────────────

export interface TaxRateSetting {
  id: string;
  name: string;
  rate: number; // fractional, e.g. 0.08
  is_default?: boolean;
}

export interface StoreSettings {
  store_name: string;
  legal_name?: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  currency_code: string; // ISO 4217, e.g. "USD"
  currency_symbol: string;
  currency_position: "before" | "after";
  locale: string; // BCP 47, drives number/date formatting
  prices_include_tax: boolean;
  tax_rates: TaxRateSetting[];
  receipt_header?: string;
  receipt_footer?: string;
  receipt_show_logo: boolean;
  receipt_show_tax_breakdown: boolean;
  receipt_paper_width: "58mm" | "80mm";
  low_stock_threshold: number;
  expiry_warning_days: number;
  loyalty_points_per_currency_unit: number; // points earned per 1 unit spent
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
