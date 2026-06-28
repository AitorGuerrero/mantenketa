# Implementation Plan: Daily Task Summary Notification (Android)

**Branch**: `016-daily-summary-notification` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-daily-summary-notification/spec.md`

## Summary

A once-a-day Android system notification summarizing tasks (new / urgent pending /
total pending), computed **locally** from the Dexie DB with **no backend** and no
sign-in. Delivery uses the **Periodic Background Sync API**: a custom service
worker wakes ~daily, reads tasks + the configured time straight from IndexedDB,
and — via a pure `shouldNotifyNow` gate — shows **one** notification per local day
**at/after** the configured time (default 08:00, a lower bound, not exact). A
settings panel ("Avísame cada día" toggle + time picker) requests permission on a
user gesture and registers/unregisters periodic sync; preferences live in the
existing Dexie `meta` store (device-local, **not synced**, no schema bump). No
in-app banner — the system notification is the only channel. Unsupported platforms
(iOS/Firefox/desktop/uninstalled) show "no disponible" and do nothing.

The summary and the time-gate are **pure functions** (`buildDailySummary`,
`shouldNotifyNow`) written test-first (Principle IV), reusing `isDone`/`isUrgent`/
`date.ts`. The PWA migrates from Workbox `generateSW` to `injectManifest` so we can
author the SW.

See [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/notification.md](./contracts/notification.md), [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8

**Primary Dependencies**: Dexie (read-only here), vite-plugin-pwa (injectManifest), Workbox (`workbox-core`/`-precaching`/`-routing`); Web platform: Service Worker, Periodic Background Sync, Notifications, Permissions APIs

**Storage**: IndexedDB (Dexie DB `mantenketa`, existing `meta` key/value store; **no schema bump** — new keys only). SW reads via raw IDB (no Dexie import).

**Testing**: Vitest (pure `buildDailySummary` + `shouldNotifyNow`, test-first); Playwright (toggle/time persistence + unsupported message). Real periodic sync not CI-testable → manual via DevTools.

**Target Platform**: Installed Android PWA on Chromium browsers (Periodic Background Sync). iOS/Firefox/desktop/uninstalled → unavailable state.

**Project Type**: Web app (single `apps/web` package), PWA.

**Performance Goals**: SW wake work is a single IDB read + pure compute (<50 ms typical); at most one notification/day.

**Constraints**: Local-only, offline-capable, no account; best-effort timing (browser-controlled, lower bound only, may skip days); once per local day; device-local settings.

**Scale/Scope**: Single household; one SW, one pure module, one settings panel.

## Constitution Check (v4.1.0)

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | How |
|---|-----------|--------|-----|
| I | Local-First | ✅ | Summary computed on-device from local Dexie; works offline and signed-out; settings stored locally. No network, no server. |
| II | One Language/Types | ✅ | TS strict; pure typed `buildDailySummary`/`shouldNotifyNow`; periodicSync ambient types at one `.d.ts` boundary; meta-key names centralized in `notifications/keys.ts`. |
| III | Spec Before Code | ✅ | spec.md + this plan.md merge before code. |
| IV | Test-First Domain | ✅ | `buildDailySummary` (counts) and `shouldNotifyNow` (time-gate) are derived logic → failing-first unit tests; reuse tested `isUrgent`/`isDone`. |
| V | Cheap | ✅ | No backend, no new paid service; only dev-dep Workbox packages. |
| VI | Single Env | ✅ | No backend/migration; only the static PWA build changes (generateSW→injectManifest). |
| VII | Simplicity | ✅ | Reuses domain; SW reads raw IDB (no Dexie/migration bundle); one panel, one pure module. The custom SW is required to handle `periodicsync` (no abstraction added). |
| VIII | Tenant-Ready | ✅ | No new shared/persisted entity and no new sync/visibility surface; settings are device-local `meta` (never synced); reads existing RLS-scoped tasks only. |
| IX | Mobile-First | ✅ | Android-targeted; settings panel designed mobile-first and verified at a narrow viewport. |

**Result**: PASS — no violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/016-daily-summary-notification/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── notification.md   # Phase 1 output (pure fns + notification + enable flow)
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks output (later)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── dailySummary.ts        # NEW pure: buildDailySummary + shouldNotifyNow (test-first)
│   │   └── dailySummary.test.ts   # NEW test-first
│   ├── sw.ts                      # NEW custom service worker (injectManifest entry)
│   ├── sw/
│   │   └── readTasks.ts           # NEW raw IDB read of tasks + meta get/put (no Dexie)
│   ├── notifications/
│   │   ├── keys.ts                # NEW shared meta-key constants + minInterval + default time
│   │   └── dailySummaryClient.ts  # NEW enable/disable: permission + periodicSync register
│   ├── components/
│   │   └── NotificationsPanel.tsx # NEW toggle + time picker (mobile-first, not auth-gated)
│   ├── types/
│   │   └── periodic-sync.d.ts     # NEW ambient types (periodicSync + permission name)
│   └── App.tsx                    # render <NotificationsPanel/>
├── vite.config.ts                 # generateSW → injectManifest (srcDir/filename, globPatterns)
├── package.json                   # + devDeps workbox-core/-precaching/-routing
├── tsconfig.app.json              # exclude sw.ts from DOM-lib build
├── tsconfig.worker.json           # NEW WebWorker lib for sw.ts
└── tsconfig.json                  # wire worker tsconfig into tsc -b
```

**Structure Decision**: Existing single-package web app. The only structural change
is migrating vite-plugin-pwa to `injectManifest` to author a custom service worker
(required for `periodicsync`); app-shell precaching + autoUpdate are preserved inside
`sw.ts`. All notification logic that can be pure is isolated in `domain/dailySummary.ts`
(test-first) and reused by the SW; the SW reads IndexedDB directly (no Dexie bundle).
Settings reuse the existing `meta` store — no DB schema change, no backend.

## Complexity Tracking

No constitution violations — section intentionally empty.
