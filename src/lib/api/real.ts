import type { PendingOrder, Product } from "@/lib/types";
import type { ApiClient } from "./client";

// Thin fetch wrapper stub. Endpoints are placeholders — adjust to the real
// backend once it exists.
export function createRealApi(baseUrl: string): ApiClient {
  const url = (path: string) => `${baseUrl.replace(/\/$/, "")}${path}`;

  return {
    async getProducts() {
      const res = await fetch(url("/products"));
      if (!res.ok) throw new Error(`getProducts failed: ${res.status}`);
      return (await res.json()) as Product[];
    },
    async createOrder(order: PendingOrder) {
      const res = await fetch(url("/orders"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(order),
      });
      if (!res.ok) throw new Error(`createOrder failed: ${res.status}`);
      return (await res.json()) as { server_id: string };
    },
  };
}
