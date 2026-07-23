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
- `src/lib/db` (`PosDB` / `db`) — Dexie wrapper over IndexedDB with `products` and `orders` tables. This is what the UI should read from directly, not the API client.
- `src/lib/api` — `ApiClient` interface (`client.ts`) implemented by two interchangeable backends:
  - `mock.ts` — in-memory fake with simulated latency, used when no API URL is set.
  - `real.ts` — thin `fetch` wrapper; endpoints are placeholder stubs pending a real backend.
  - `index.ts` selects real vs. mock based on `NEXT_PUBLIC_API_URL`.
- `src/lib/sync` (`SyncManager` / `syncManager`) — polls every 15s: pushes orders with `sync_status: "pending"` to the API, pulls/refreshes the product cache. Retry/backoff and conflict handling are not yet implemented (see TODOs in the file) — orders that fail to push are marked `sync_status: "error"` and not retried automatically.
- `src/lib/store` — Zustand stores: `cart.ts` (cart line items, derives subtotal/tax/total in cents; tax rate is captured per-product at add-to-cart time, not re-fetched), `connection.ts` (online/offline UI state, seeded from `navigator.onLine`).
- `src/components/providers/query-provider.tsx` — TanStack Query provider; one `QueryClient` created in component state per session (server-safe).

Path alias: `@/*` maps to `src/*` (see `tsconfig.json`).

React Compiler is enabled (`next.config.ts` `reactCompiler: true`, `babel-plugin-react-compiler` devDependency) — avoid manual `useMemo`/`useCallback` micro-optimizations that fight the compiler.

## Code quality

No `sonar-project.properties` in this repo (no local SonarQube config) — if CI runs SonarQube/SonarCloud analysis on this project, treat new blocker/critical issues on changed lines as build-breaking and fix them before considering a change done.