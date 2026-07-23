import type { PendingOrder, Product } from "@/lib/types";
import type {
  ApiClient,
  AuthUser,
  LoginResult,
  SyncOrderOutcome,
  SyncOrderResult,
  SyncOrdersResponse,
} from "./client";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const STORAGE_KEY = "mock_api_state_v1";
const DEFAULT_SYNC_DELAY_MS = 800;

const DEFAULT_PRODUCTS: Product[] = [
  { id: "p_espresso", name: "Espresso", sku: "COF-ESP", barcode: "8901000000019", price_cents: 300, tax_rate: 0.08, stock_quantity: 250 },
  { id: "p_americano", name: "Americano", sku: "COF-AME", barcode: "8901000000026", price_cents: 320, tax_rate: 0.08, stock_quantity: 250 },
  { id: "p_latte", name: "Latte", sku: "COF-LAT", barcode: "8901000000033", price_cents: 450, tax_rate: 0.08, stock_quantity: 180 },
  { id: "p_cappuccino", name: "Cappuccino", sku: "COF-CAP", barcode: "8901000000040", price_cents: 450, tax_rate: 0.08, stock_quantity: 180 },
  { id: "p_mocha", name: "Mocha", sku: "COF-MOC", barcode: "8901000000057", price_cents: 480, tax_rate: 0.08, stock_quantity: 120 },
  { id: "p_flat_white", name: "Flat White", sku: "COF-FLW", barcode: "8901000000064", price_cents: 460, tax_rate: 0.08, stock_quantity: 90 },
  { id: "p_cold_brew", name: "Cold Brew", sku: "COF-CBR", barcode: "8901000000071", price_cents: 420, tax_rate: 0.08, stock_quantity: 60 },
  { id: "p_hot_chocolate", name: "Hot Chocolate", sku: "BEV-HCH", barcode: "8901000000088", price_cents: 400, tax_rate: 0.08, stock_quantity: 75 },
  { id: "p_chai_latte", name: "Chai Latte", sku: "BEV-CHA", barcode: "8901000000095", price_cents: 430, tax_rate: 0.08, stock_quantity: 3 },
  { id: "p_orange_juice", name: "Orange Juice", sku: "BEV-OJ", barcode: "8901000000101", price_cents: 350, tax_rate: 0.05, stock_quantity: 40 },
  { id: "p_still_water", name: "Still Water 500ml", sku: "BEV-WAT", barcode: "8901000000118", price_cents: 150, tax_rate: 0.0, stock_quantity: 300 },
  { id: "p_croissant", name: "Croissant", sku: "BAK-CRO", barcode: "8901000000125", price_cents: 275, tax_rate: 0.08, stock_quantity: 40 },
  { id: "p_pain_au_choc", name: "Pain au Chocolat", sku: "BAK-PAC", barcode: "8901000000132", price_cents: 295, tax_rate: 0.08, stock_quantity: 35 },
  { id: "p_blueberry_muffin", name: "Blueberry Muffin", sku: "BAK-MUF", barcode: "8901000000149", price_cents: 310, tax_rate: 0.08, stock_quantity: 25 },
  { id: "p_bagel", name: "Plain Bagel", sku: "BAK-BAG", barcode: "8901000000156", price_cents: 260, tax_rate: 0.08, stock_quantity: 0 },
  { id: "p_cinnamon_roll", name: "Cinnamon Roll", sku: "BAK-CIN", barcode: "8901000000163", price_cents: 325, tax_rate: 0.08, stock_quantity: 15 },
  { id: "p_avocado_toast", name: "Avocado Toast", sku: "FOD-AVT", barcode: "8901000000170", price_cents: 650, tax_rate: 0.08, stock_quantity: 20 },
  { id: "p_club_sandwich", name: "Club Sandwich", sku: "FOD-CLB", barcode: "8901000000187", price_cents: 750, tax_rate: 0.08, stock_quantity: 12 },
  { id: "p_potato_chips", name: "Potato Chips", sku: "SNK-CHP", barcode: "8901000000194", price_cents: 220, tax_rate: 0.08, stock_quantity: 55 },
  { id: "p_choc_chip_cookie", name: "Chocolate Chip Cookie", sku: "SNK-CKI", barcode: "8901000000200", price_cents: 200, tax_rate: 0.08, stock_quantity: 1 },
  { id: "p_ceramic_mug", name: "Branded Ceramic Mug", sku: "RTL-MUG", barcode: "8901000000217", price_cents: 1200, tax_rate: 0.08, stock_quantity: 8 },
];

interface MockApiState {
  products: Product[];
  syncedOrderIds: string[];
}

function defaultState(): MockApiState {
  return { products: structuredClone(DEFAULT_PRODUCTS), syncedOrderIds: [] };
}

// In-memory + localStorage-backed state, separate from the real IndexedDB
// offline store. This only simulates a persistent backend for frontend dev;
// it is lazily loaded so importing this module is safe during SSR/build.
let state: MockApiState | null = null;

function getState(): MockApiState {
  if (state) return state;

  if (typeof window === "undefined") {
    state = defaultState();
    return state;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    state = raw ? (JSON.parse(raw) as MockApiState) : defaultState();
  } catch {
    state = defaultState();
  }
  return state;
}

function saveState() {
  if (typeof window === "undefined" || !state) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function encodeBase64Url(value: string): string {
  const base64 =
    typeof btoa === "function"
      ? btoa(value)
      : Buffer.from(value, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function makeFakeJwt(user: AuthUser): string {
  const header = encodeBase64Url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({ sub: user.id, email: user.email, exp: Date.now() + 3_600_000 }),
  );
  return `${header}.${payload}.mock-signature`;
}

let syncDelayMs = DEFAULT_SYNC_DELAY_MS;
let forcedSyncResult: SyncOrderResult | null = null;

// Test/demo hooks - not part of the ApiClient contract, so realApi has no equivalent.
function setSyncDelay(ms: number) {
  syncDelayMs = ms;
}

// Forces every order in the *next* syncOrders() call to this result, then resets.
function setNextSyncResult(result: SyncOrderResult | null) {
  forcedSyncResult = result;
}

function resolveOrderResult(order: PendingOrder, apiState: MockApiState): SyncOrderOutcome {
  if (forcedSyncResult) {
    return { client_generated_id: order.client_generated_id, result: forcedSyncResult };
  }

  if (apiState.syncedOrderIds.includes(order.client_generated_id)) {
    return { client_generated_id: order.client_generated_id, result: "already_synced" };
  }

  apiState.syncedOrderIds.push(order.client_generated_id);
  return {
    client_generated_id: order.client_generated_id,
    result: "synced",
    server_id: `srv_${order.client_generated_id}`,
  };
}

// In-memory fake with simulated latency + configurable test scenarios. Used
// when NEXT_PUBLIC_USE_MOCK_API is not explicitly "false".
export const mockApi: ApiClient & {
  setSyncDelay: typeof setSyncDelay;
  setNextSyncResult: typeof setNextSyncResult;
} = {
  async login(email: string, password: string): Promise<LoginResult> {
    await delay(200);
    if (!email || !password) {
      throw new Error("email and password are required");
    }
    const user: AuthUser = {
      id: `user_${encodeBase64Url(email).slice(0, 12)}`,
      email,
      name: email.split("@")[0],
    };
    return { token: makeFakeJwt(user), user };
  },

  async getProducts(): Promise<Product[]> {
    await delay(150);
    return structuredClone(getState().products);
  },

  async syncOrders(orders: PendingOrder[]): Promise<SyncOrdersResponse> {
    await delay(syncDelayMs);
    const apiState = getState();
    const results = orders.map((order) => resolveOrderResult(order, apiState));
    forcedSyncResult = null;
    saveState();
    return { results };
  },

  setSyncDelay,
  setNextSyncResult,
};
