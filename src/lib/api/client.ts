import type { PendingOrder, Product } from "@/lib/types";

// Contract shared by the real (HTTP) and mock API clients.
export interface ApiClient {
  getProducts(): Promise<Product[]>;
  createOrder(order: PendingOrder): Promise<{ server_id: string }>;
}
