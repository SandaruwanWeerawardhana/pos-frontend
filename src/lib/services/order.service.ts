import { httpClient, type HttpClient } from "./http-client";
import type { SyncOrdersResponse } from "@/lib/api/client";
import type { PendingOrder } from "@/lib/types";

export class OrderService {
  constructor(private readonly http: HttpClient) {}

  syncOrders(orders: PendingOrder[]): Promise<SyncOrdersResponse> {
    return this.http.request<SyncOrdersResponse>("/orders/sync", {
      method: "POST",
      body: { orders },
    });
  }
}

export const orderService = new OrderService(httpClient);
