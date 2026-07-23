import type { ApiClient } from "./client";
import { mockApi } from "./mock";
import { createRealApi } from "./real";

const baseUrl = process.env.NEXT_PUBLIC_API_URL;

// Real client when an API URL is configured, otherwise the in-memory mock.
export const api: ApiClient = baseUrl ? createRealApi(baseUrl) : mockApi;

export type { ApiClient } from "./client";
