import type { ApiClient } from "./client";

// Stub for the real Go backend. Same method signatures as mockApi so
// switching NEXT_PUBLIC_USE_MOCK_API to "false" is a one-line config change,
// not a rewrite - fill these in once the backend exists.
function notImplemented(method: string): never {
  throw new Error(`realApi.${method}() is not implemented yet - backend not ready`);
}

export const realApi: ApiClient = {
  async login() {
    return notImplemented("login");
  },
  async getProducts() {
    return notImplemented("getProducts");
  },
  async syncOrders() {
    return notImplemented("syncOrders");
  },
};
