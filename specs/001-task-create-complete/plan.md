# Implementation Plan: Task Create & Complete

**Branch**: `001-task-create-complete` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-task-create-complete/spec.md`

## Summary

Deliver the create → list → mark-done loop as a **local-only, single-person
PWA**. The UI binds to a local data layer (Dexie/IndexedDB) for instant,
offline-capable reads and writes; there is no backend, no sync, and no auth in
this phase. Data lives in the user's browser and persists across reloads. A
backend (Supabase), multi-device sync, owner identity, and authentication are
explicitly deferred to a later phase (Constitution v3.0.0).

See [research.md](./research.md) for the decisions, [data-model.md](./data-model.md)
for the schema, and [contracts/data-access.md](./contracts/data-access.md) for the
repository the UI binds to.

## Technical Context

**Language/Version**: TypeScript 5.x (strict); Node 20 tooling

**Primary Dependencies**: React 18, Vite, vite-plugin-pwa (Workbox), Dexie +
dexie-react-hooks, Zod

**Storage**: Browser **IndexedDB** via Dexie (the only data store; device is the
source of truth). No backend / no database server.

**Testing**: Vitest (unit — domain logic, test-first), Playwright (e2e incl.
reload-persistence)

**Target Platform**: Modern evergreen browsers as an installable PWA (mobile +
desktop)

**Project Type**: Single-page web app (static SPA, no backend); pnpm-managed

**Performance Goals**: Instant local reads from IndexedDB (sub-frame); task
create in <20s (SC-001); mark-done in a single action (SC-003)

**Constraints**: Fully usable with no network (Principle I — local-only); zero
running cost (Principle V); single deployable environment (Principle VI)

**Scale/Scope**: One person, one device/browser, a few hundred tasks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*
*(Evaluated against Constitution v3.0.0.)*

| # | Principle | Status | How this plan complies |
|---|-----------|--------|------------------------|
| I | Local-First | ✅ PASS | Dexie/IndexedDB is the source of truth; app works fully offline. Spec's Offline Behavior section answers "local-only, no sync". |
| II | One Language, One Type System | ✅ PASS | TypeScript everywhere; `Task` type + Zod defined once in `src/domain`. No SQL (no backend this phase). |
| III | Spec Before Code | ✅ PASS | spec.md + this plan.md before any implementation; clarifications resolved. |
| IV | Test-First for Domain Logic | ✅ PASS | Completion state-transition logic and list ordering are domain logic → unit tests written failing first. (No recurrence/overdue logic in this feature.) |
| V | Cheap by Default | ✅ PASS | Local-only + Cloudflare Pages free hosting → zero running cost. No paid services. |
| VI | Single Deployable Environment | ✅ PASS | One Cloudflare Pages production deploy from `main`; free PR preview deploys allowed. No backend env. |
| VII | Simplicity Over Framework Magic | ✅ PASS | Single app (no premature monorepo packages); Dexie is a thin wrapper, not a framework; no sync machinery built before a backend needs it. |
| VIII | Tenant-Ready Data Model | ✅ N/A | Dormant per v3.0.0 — local-only single person carries no owner id. Activates with the future backend phase. |

**Result**: All gates pass. No violations → Complexity Tracking is empty.

**Note on deferral**: dropping the backend/sync/owner-id work is a deliberate
constitution-aligned scope reduction, not a violation. The future multi-user
phase will reintroduce Supabase, an outbox+LWW sync layer, owner identity + RLS
(Principle VIII reactivates), and authentication.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-create-complete/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── data-access.md   # local TaskRepository the UI binds to
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
apps/web/                     # Vite + React PWA — the only deployable
├── src/
│   ├── domain/               # Task type + Zod schema + pure logic
│   │                         #   (ordering, completion toggle) — test-first
│   ├── data/                 # Dexie database + TaskRepository implementation
│   ├── components/
│   └── pages/
└── tests/                    # vitest (unit) + playwright (e2e)

pnpm-workspace.yaml           # workspaces-ready; no shared/backend package yet
```

**Structure Decision**: A single Vite app under `apps/web`, managed with pnpm.
No `packages/shared` and no `supabase/` directory in this phase — there is only
one consumer and no backend, so introducing them now would violate Principle VII.
The workspace file is kept so the structure can grow into shared/backend packages
when the multi-user phase arrives. All domain types and pure logic live in
`src/domain` and are reused directly.

## Complexity Tracking

> No constitution violations — no entries required.
