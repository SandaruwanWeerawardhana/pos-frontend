import { httpClient, type HttpClient } from "./http-client";
import type { Product } from "@/lib/types";

export class ProductService {
  constructor(private readonly http: HttpClient) {}

  getProducts(): Promise<Product[]> {
    return this.http.request<Product[]>("/products");
  }
}

export const productService = new ProductService(httpClient);
