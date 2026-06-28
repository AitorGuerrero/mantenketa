---
description: "Task list for feature 016 — daily task summary notification (Android, local)"
---
# Tasks: Daily Task Summary Notification (Android)

**Input**: design docs in `/specs/016-daily-summary-notification/` (plan, spec, research, data-model, contracts/notification.md, quickstart)

**Tests**: Principle IV — `buildDailySummary` and `shouldNotifyNow` are derived
logic → **failing-first** unit tests. UI/enable flow via Playwright (real periodic
sync isn't CI-testable; manual via DevTools per quickstart).

**Format**: `[ID] [P?] [Story?] Description (file path)` · [P] = parallelizable (different files, no incomplete deps)

---

## Phase 1: Setup — service worker migration & build config (BLOCKS all stories)

**Purpose**: Move vite-plugin-pwa from generateSW to injectManifest so we can author
a custom SW for `periodicsync`, **without** losing app-shell offline precaching or
autoUpdate. Validate `pnpm build` + offline boot before continuing.

- [X] T001 `apps/web/vite.config.ts`: `strategies:'injectManifest'`, `srcDir:'src'`, `filename:'sw.ts'`; move `globPatterns` under `injectManifest`; keep `registerType:'autoUpdate'` + manifest unchanged
- [X] T002 [P] `apps/web/package.json`: add devDeps `workbox-core`, `workbox-precaching`, `workbox-routing` (match `workbox-window` ^7.x) via pnpm
- [X] T003 `apps/web/tsconfig.worker.json` (NEW, `lib:["ES2022","WebWorker"]`) for `sw.ts`; exclude `sw.ts` from `tsconfig.app.json`; wire the worker tsconfig into `apps/web/tsconfig.json` `tsc -b` chain
- [X] T004 [P] `apps/web/src/types/periodic-sync.d.ts` (NEW): ambient `PeriodicSyncManager`/`registration.periodicSync`/`PeriodicSyncEvent` + `'periodic-background-sync'` permission name
- [X] T005 `apps/web/src/sw.ts` (NEW) skeleton: `precacheAndRoute(self.__WB_MANIFEST)` + SPA `NavigationRoute(createHandlerBoundToURL('index.html'))` + `self.skipWaiting()`/`clientsClaim()`; verify `pnpm build` then offline reload still boots

**Checkpoint**: PWA builds with the custom SW; offline + autoUpdate behaviour preserved.

---

## Phase 2: Foundational — pure logic, meta keys & SW read (BLOCKS all stories)

- [X] T006 [P] Failing-first unit tests `apps/web/src/domain/dailySummary.test.ts` per contracts truth tables: `buildDailySummary` (empty→zeros; pending excludes done; urgentCount via isUrgent; new strictly-after; lastSummaryAt null⇒0; urgentNames cap 3) and `shouldNotifyNow` (before/at/after time; already-notified-today; default 08:00; malformed time)
- [X] T007 `apps/web/src/domain/dailySummary.ts` (NEW): pure `buildDailySummary(tasks, today, lastSummaryAt)` + `shouldNotifyNow(now, time, lastNotifiedDay)` reusing `isDone`/`isUrgent`/`date.ts` — makes T006 pass
- [X] T008 [P] `apps/web/src/notifications/keys.ts` (NEW): meta-key constants (`dailySummaryEnabled`, `dailySummary.time`, `dailySummary.lastSummaryAt`, `dailySummary.lastNotifiedDay`), `DEFAULT_TIME='08:00'`, `MIN_INTERVAL=24h`, `PERIODIC_TAG='daily-task-summary'`
- [X] T009 `apps/web/src/sw/readTasks.ts` (NEW): raw `indexedDB.open('mantenketa')` (no version) `getAll('tasks')` → `Task[]`; `getMeta(key)`/`putMeta(key,value)` over `meta`; no Dexie import

**Checkpoint**: counts + time-gate computable and tested; SW can read tasks/meta.

---

## Phase 3: User Story 1 — turn on & receive the daily notification (Priority: P1) 🎯 MVP

**Goal**: With the toggle on (permission granted) on a supported device, one Android
notification per day at/after the time summarizes new/urgent/pending.

**Independent Test**: enable + grant; DevTools → Periodic Background Sync → Trigger
`daily-task-summary` → one notification with correct counts; second trigger same day → none; tap → app opens.

- [X] T010 [US1] `apps/web/src/sw.ts`: `periodicsync` handler (guard tag) → `runDailySummary()`: read `dailySummaryEnabled` (bail), `dailySummary.time`/`lastNotifiedDay`, `shouldNotifyNow` gate, `readAllTasks()`, `buildDailySummary`, `showNotification` (tag `daily-task-summary`, body "N nuevas · U urgentes · P pendientes" + up to 3 names, `data.url='/'`), advance `lastNotifiedDay`/`lastSummaryAt`; add `notificationclick` → focus existing client or `openWindow('/')`
- [X] T011 [US1] `apps/web/src/notifications/dailySummaryClient.ts` (NEW): `enableDailySummary()`→`'enabled'|'denied'|'unsupported'` (feature-detect `periodicSync`, `Notification.requestPermission()` on gesture, `permissions.query`, `periodicSync.register(PERIODIC_TAG,{minInterval})`, persist enabled+default time) and `disableDailySummary()`
- [X] T012 [US1] `apps/web/src/components/NotificationsPanel.tsx` (NEW): "Avísame cada día" toggle reading `dailySummaryEnabled` via `useObservable(liveQuery(...))`; on→`enableDailySummary()` mapping result (enabled/denied/unsupported); render `<NotificationsPanel/>` in `apps/web/src/App.tsx`; mobile-first styles in `apps/web/src/index.css`; not auth-gated
- [X] T013 [US1] Playwright `apps/web/tests/e2e/daily-summary.spec.ts` (NEW): panel renders; toggle persists across reload (stub/unsupported-tolerant — real periodicsync not in CI)

**Checkpoint**: core daily notification works on a supported device.

---

## Phase 4: User Story 2 — configurable time, default 08:00 (Priority: P2)

**Goal**: User sets the time; the notification then appears no earlier than it.

**Independent Test**: set time in the past → trigger shows it; set future → trigger shows nothing.

- [X] T014 [US2] `apps/web/src/components/NotificationsPanel.tsx`: add `<input type="time">` (default 08:00) persisting `dailySummary.time`; helper text "a partir de esa hora, aprox."; no re-register on change
- [X] T015 [US2] Confirm SW gating uses `dailySummary.time` end-to-end (handler reads it; `shouldNotifyNow` threshold already unit-tested in T006); add an e2e assertion in `daily-summary.spec.ts` that the chosen time persists across reload

**Checkpoint**: time configurable and honoured as a lower bound.

---

## Phase 5: User Story 3 — turn off & graceful unsupported (Priority: P3)

**Goal**: Toggling off stops notifications; unsupported platforms show "no disponible".

- [X] T016 [US3] `apps/web/src/components/NotificationsPanel.tsx`: toggle off → `disableDailySummary()` (unregister + persist false); when `enableDailySummary()`/feature-detect returns `unsupported`, render the toggle disabled with "no disponible en este navegador"; `denied` → off + "permiso necesario"
- [X] T017 [US3] Extend `apps/web/tests/e2e/daily-summary.spec.ts`: with `periodicSync` absent (mocked), panel shows "no disponible" and cannot enable; toggling off persists the off state

**Checkpoint**: all three stories independently functional.

---

## Phase 6: Polish & validation

- [X] T018 Decide the all-zeros policy (research open choice): default **show** "Nada pendiente hoy"; if skip preferred, guard in `runDailySummary` — keep it a one-line policy in the SW, counts still from `buildDailySummary`
- [X] T019 Full validation: `pnpm --filter @mantenketa/web test` (incl. dailySummary, test-first), lint, `tsc -b` (app + worker), build, `test:e2e` green; manual periodic-sync trigger per quickstart; confirm offline boot intact after injectManifest migration; regression: existing PWA install/update + features 003–015 unaffected

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** blocks everything (the SW must exist and build). T001→T003→T005; T002/T004 [P].
- **Phase 2 (Foundational)** blocks all stories. T006→T007; T008/T009 [P]. (T009 used by US1's SW handler.)
- **US1 (P1)** depends on Phases 1–2. T010 (SW handler) + T011 (client) → T012 (panel) → T013 (e2e).
- **US2 (P2)** depends on US1 (panel + handler exist). T014 → T015.
- **US3 (P3)** depends on US1 (panel + client). T016 → T017.
- **Polish** after desired stories.

### Within each story
Test-first: T006 written and failing before T007. UI e2e (T013/T015/T017) after the panel exists.

### Parallel opportunities
- T002 ∥ T004 (config vs types). 
- T006 ∥ T008 (tests vs keys), both before/independent of T007/T009.

---

## Implementation Strategy

- **MVP = Phases 1–2 + US1** (T001–T013): the daily notification with default 08:00.
  Stop and validate via DevTools trigger (T013 + manual) before US2/US3.
- **Incremental**: add US2 (time picker) → US3 (off + unsupported) → polish. Each
  independently testable; no regression to earlier stories.

## Notes
- No backend, no DB schema change (meta keys only), no sync — settings device-local.
- Honest ceiling: Android/Chromium installed PWA only; "08:00" is a lower bound,
  browser-controlled, may skip days; elsewhere → unavailable, no notification.
- **Verification scope**: build/tsc(app+worker)/lint/147 unit/79 e2e/24 RLS all green.
  The e2e (`daily-summary.spec.ts`) covers the panel rendering/integration; the
  **actual background notification + permission flow can only be verified on a real
  installed Android PWA** (or via DevTools → Periodic Background Sync → Trigger),
  per quickstart — not automatable in CI. The counting + time-gate logic is fully
  covered by `dailySummary.test.ts`.
- Regression fixed: the toggle label "Avísame cada día" collided with the e2e
  helper's `getByLabel('Cada')`; made those selectors `exact` (ui.ts, edit-tasks).
- Total: 19 tasks.
