import type { PendingOrder, Product } from "@/lib/types";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  businessName: string;
  businessType: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface ProfileUpdate {
  name?: string;
  email?: string;
  businessName?: string;
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
    businessType: string,
  ): Promise<LoginResult>;
  // Always resolves, even for an unknown address: telling a caller whether an
  // email is registered is an account-enumeration leak. The returned token is
  // the dev-mode convenience the mock backend hands back so the reset screen
  // can be exercised without a mail server; the real backend returns none.
  requestPasswordReset(email: string): Promise<{ devToken?: string }>;
  resetPassword(token: string, newPassword: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  updateProfile(update: ProfileUpdate): Promise<AuthUser>;
  getProducts(): Promise<Product[]>;
  syncOrders(orders: PendingOrder[]): Promise<SyncOrdersResponse>;
}
