# WizChat Rebuild — Offline-first, Low-data Architecture

This file summarizes the core changes introduced in the partial rebuild and where to continue implementation.

Overview
- Modular layered structure added under `src/core`, `src/services`, `src/features`, `src/ui`, `src/hooks`.
- Key primitives added:
  - `CacheEngine` (IndexedDB) — `src/core/cacheEngine.ts`
  - `networkController` — `src/core/networkController.ts`
  - `dataSaver` utilities (delta, resize) — `src/core/dataSaver.ts`
  - `supabase` wrapper with query caching — `src/services/supabaseClient.ts`
  - `syncEngine` for queued writes and exponential backoff — `src/services/syncEngine.ts`
  - `OptimizedChatRoom` — instant local load, virtualized list, minimal realtime — `src/features/chat/OptimizedChatRoom.tsx`
  - `VirtualizedList` and `ErrorBoundary` UI primitives

Goals achieved (initial):
- Instant local-first chat load from IndexedDB
- Virtualized chat list for memory-friendly rendering
- Minimal realtime subscription (new messages only)
- Offline queueing for writes with retry/backoff
- Network intelligence basic hook and controller

Next steps to complete the full rebuild (recommended):
1. Replace remaining heavy realtime listeners with targeted channels.
2. Implement a full Data Saver Engine (gzip/brotli) on server + client if allowed.
3. Add service-worker logic for caching API responses and background sync (`/service-worker.js`).
4. Migrate existing dataService usages to `supabaseClient.queryWithCache` and `syncEngine.enqueue`.
5. Add image CDN integration + signed uploads + lazy thumbnails.
6. Add more thorough delta-sync using per-table last-modified timestamps and sequence tokens.
7. Profile bundle sizes and add route-level code-splitting where missing.

How to try locally
1. Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in `.env`.
2. Run `pnpm|npm|yarn install` then `npm run dev`.

Files added (quick index)
- `src/core/*` — low-level engines: cache, network, data-saver
- `src/services/*` — supabase wrapper, sync engine
- `src/features/chat/*` — optimized chat room
- `src/ui/*` — Virtualized list, ErrorBoundary
- `src/hooks/*` — useNetwork

If you want, I can:
- Replace more screens with optimized lazy-loaded variants.
- Implement a full service-worker script and background sync handlers.
- Add tests and run the app locally to validate latency and memory behaviour.
