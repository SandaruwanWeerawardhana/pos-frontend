# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Next.js version warning

This repo runs Next.js 16.2.11, which has breaking API/convention changes vs. older Next.js knowledge. Docs are bundled locally in `node_modules/next/dist/docs/` (organized `01-app/`, `02-pages/`, `03-architecture/`, `04-community/`) — check the relevant doc there before using an App Router API you're not sure is current.

## Commands

- `npm run dev` — start dev server (Turbopack, via `next dev`)
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

No test runner is configured in this repo yet.

## Architecture

Local-first POS app. Data flows: UI reads/writes IndexedDB (via Dexie) as the source of truth; a background `SyncManager` reconciles with the server API on an interval.

- `src/lib/types` — shared domain types. **Money is always integer cents (`price_cents`, `total_cents`, etc.), never floats.**
- `src/lib/db` (`PosDB` / `db`) — Dexie wrapper over IndexedDB with `products`, `cartItems`, `pendingOrders`, and `syncMeta` tables, plus the functions the UI calls directly (`searchProducts`, `addToCart`, `createLocalOrder`, etc.) — see the file for the full list. This is what the UI should read from directly, not the API client. Cart state lives in `cartItems`, not a separate store.
- `src/lib/api` — `ApiClient` interface (`client.ts`: `login`, `getProducts`, `syncOrders`) implemented by two interchangeable backends:
  - `mock.ts` — in-memory + `localStorage`-backed fake (separate from the IndexedDB offline store; only for frontend dev persistence across reloads) with simulated latency and test hooks (`mockApi.setSyncDelay`, `mockApi.setNextSyncResult`) for forcing sync outcomes.
  - `real.ts` — stub for the real Go backend; every method throws "not implemented" pending the real backend.
  - `index.ts` exports `apiClient`, chosen via `NEXT_PUBLIC_USE_MOCK_API` (mock unless explicitly set to `"false"`).
- `src/lib/sync` (`SyncManager` / `syncManager`) — polls every 15s: batches orders with `sync_status: "pending"` to `apiClient.syncOrders`, pulls/refreshes the product cache. Retry/backoff is not yet implemented (see TODO in the file) — orders that fail to push are marked `sync_status: "error"` and not retried automatically; conflicts reported by the server are marked `sync_status: "conflict"`.
- `src/lib/store` — Zustand store: `connection.ts` (online/offline UI state, seeded from `navigator.onLine`, kept in sync with the browser's `online`/`offline` events via `useConnectionListener`).
- `src/components/providers/query-provider.tsx` — TanStack Query provider; one `QueryClient` created in component state per session (server-safe).

Path alias: `@/*` maps to `src/*` (see `tsconfig.json`).

React Compiler is enabled (`next.config.ts` `reactCompiler: true`, `babel-plugin-react-compiler` devDependency) — avoid manual `useMemo`/`useCallback` micro-optimizations that fight the compiler.

## Code quality

No `sonar-project.properties` in this repo (no local SonarQube config) — if CI runs SonarQube/SonarCloud analysis on this project, treat new blocker/critical issues on changed lines as build-breaking and fix them before considering a change done.