import type { PendingOrder, Product } from "@/lib/types";
import type { ApiClient } from "./client";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: "p_espresso",
    name: "Espresso",
    sku: "COF-ESP",
    barcode: "0001",
    price_cents: 300,
    tax_rate: 0.08,
    stock_quantity: 999,
  },
  {
    id: "p_latte",
    name: "Latte",
    sku: "COF-LAT",
    barcode: "0002",
    price_cents: 450,
    tax_rate: 0.08,
    stock_quantity: 999,
  },
  {
    id: "p_croissant",
    name: "Croissant",
    sku: "BAK-CRO",
    barcode: "0003",
    price_cents: 275,
    tax_rate: 0.08,
    stock_quantity: 40,
  },
];

// In-memory fake with simulated latency. Default client when no API URL set.
export const mockApi: ApiClient = {
  async getProducts() {
    await delay(150);
    return structuredClone(SAMPLE_PRODUCTS);
  },
  async createOrder(order: PendingOrder) {
    await delay(150);
    return { server_id: `srv_${order.client_generated_id}` };
  },
};
