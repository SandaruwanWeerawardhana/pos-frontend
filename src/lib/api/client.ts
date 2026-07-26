import type { PendingOrder, Product } from "@/lib/types";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  businessName: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export type SyncOrderResult = "synced" | "already_synced" | "conflict" | "error";

export interface SyncOrderOutcome {
  client_generated_id: string;
  result: SyncOrderResult;
  server_id?: string;
}

export interface SyncOrdersResponse {
  results: SyncOrderOutcome[];
}

// Contract shared by the real (HTTP, Go backend) and mock API clients.
export interface ApiClient {
  login(email: string, password: string): Promise<LoginResult>;
  register(
    ownerName: string,
    businessName: string,
    email: string,
    password: string,
  ): Promise<LoginResult>;
  getProducts(): Promise<Product[]>;
  syncOrders(orders: PendingOrder[]): Promise<SyncOrdersResponse>;
}
