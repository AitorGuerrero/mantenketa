# Phase 0 Research: Daily Task Summary Notification

**Feature**: 016-daily-summary-notification · 2026-06-28

All external feasibility was resolved before planning (see the approved design
note). Decisions below; no open NEEDS CLARIFICATION.

## D1 — Delivery mechanism: Periodic Background Sync (local), not server push

- **Decision**: Use the **Periodic Background Sync API** in a custom service
  worker to wake ~daily and show a local notification computed from Dexie. No
  backend, no Web Push, no VAPID.
- **Rationale**: Matches Principle I (local-first) and V (cheap); works offline
  and without an account. The user explicitly chose local over a server cron.
- **Alternatives**: (a) Server push + cron — only true exact-time option but needs
  a backend, login, subscriptions table, and only covers synced tasks; rejected by
  the user. (b) `Notification Triggers` (`showTrigger`/`TimestampTrigger`) — would
  give exact local time, but it never shipped beyond an abandoned origin trial;
  not viable.

## D2 — Time is a lower bound, gated in the SW

- **Decision**: Store a configured time (default `08:00`). On each `periodicsync`
  wake, a pure `shouldNotifyNow(now, time, lastNotifiedDay)` decides to notify iff
  the local day differs from `lastNotifiedDay` AND the local clock ≥ time.
- **Rationale**: Periodic Background Sync timing is browser-controlled; we cannot
  fire at an exact time. Gating on "≥ time, once per day" is the faithful, testable
  approximation the user accepted ("a partir de").
- **Alternatives**: trusting the browser to wake exactly at the time — impossible.

## D3 — Service worker strategy: generateSW → injectManifest

- **Decision**: Switch vite-plugin-pwa to `strategies: 'injectManifest'`,
  `srcDir: 'src'`, `filename: 'sw.ts'`; move `globPatterns` under `injectManifest`.
  Author `sw.ts` with `precacheAndRoute(self.__WB_MANIFEST)` + SPA `NavigationRoute`
  + `self.skipWaiting()`/`clientsClaim()` to preserve current offline + autoUpdate
  behavior, then add the `periodicsync` + `notificationclick` handlers.
- **Rationale**: A custom SW is required to handle `periodicsync`; generateSW can't.
  `virtual:pwa-register` + `registerSW({immediate:true})` keep working unchanged.
- **Add devDeps**: `workbox-core`, `workbox-precaching`, `workbox-routing` (today
  only `workbox-window` is direct; the others are transitive). Match ^7.x.
- **Risk**: worker TS lib — `sw.ts` needs `WebWorker` lib, not `DOM`. Add
  `tsconfig.worker.json` and exclude `sw.ts` from `tsconfig.app.json`; wire into
  `tsc -b`. Validate `pnpm build` early. Ambient `periodic-sync.d.ts` for
  `registration.periodicSync` + the `'periodic-background-sync'` permission name
  (not in stock TS DOM lib).

## D4 — Reading tasks/meta in the SW: raw IndexedDB, not Dexie

- **Decision**: In the SW, open `indexedDB.open('mantenketa')` **with no version**
  (never triggers the v1–v9 upgrade chain) and `getAll('tasks')`; read/write the
  `meta` store the same way. Do **not** import `db.ts`/Dexie into the SW bundle.
- **Rationale**: Principle VII + bundle size — the SW only needs to read; importing
  Dexie pulls the whole migration chain and couples the SW to schema lifecycle. The
  app (main thread) owns migrations and has already opened/upgraded the DB.
- **Confirmed**: `domain/task.ts` (isDone), `urgency.ts` (isUrgent), `date.ts`
  import only zod + each other (no React/DOM) → bundle cleanly into the worker.

## D5 — "New" definition and first-run

- **Decision**: new = outstanding tasks with `createdAt > lastSummaryAt` (ISO string
  compare, both UTC). First run (`lastSummaryAt === null`) ⇒ `newCount = 0`.
- **Rationale**: Avoids a noisy "everything is new" first notification; matches the
  spec edge case.

## D6 — Settings storage: existing Dexie `meta`, device-local, no schema bump

- **Decision**: Store `dailySummaryEnabled`, `dailySummary.time`,
  `dailySummary.lastSummaryAt`, `dailySummary.lastNotifiedDay` in the existing
  `meta` key/value store (already at `db.version(9)`). Key names centralized in
  `notifications/keys.ts` so the SW (raw IDB) and app (Dexie) never drift.
- **Rationale**: `meta` already exists; settings are inherently per-device and not
  synced (Principle VIII unaffected). No migration.

## D7 — Permission + registration on user gesture; graceful unsupported

- **Decision**: `enableDailySummary()` feature-detects `'periodicSync' in
  registration`, calls `Notification.requestPermission()` on the toggle gesture,
  checks `permissions.query({name:'periodic-background-sync'})`, then
  `periodicSync.register('daily-task-summary', { minInterval: 24h })`. Returns
  `enabled` | `denied` | `unsupported`; the panel maps each to UI.
- **Rationale**: Permission must be gesture-initiated; unsupported platforms must
  be honest (no in-app fallback by user decision).

## Open product choice (for tasks/implementation)

- **All-zeros notification**: show "nada pendiente hoy" vs. skip entirely when
  new/urgent/pending are all 0. Spec assumes *show*; revisit if noisy. Either way
  `buildDailySummary` returns the counts; the show/skip decision is a one-line policy.

## Unchanged

No changes to tasks, sync, RLS, or the data schema. This feature only reads tasks
and writes device-local settings.
