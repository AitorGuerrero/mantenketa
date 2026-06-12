# Phase 0 Research: Task Create & Complete

**Feature**: 001-task-create-complete · **Date**: 2026-06-07

Resolves the technical unknowns for a **local-only, single-person PWA** (no
backend, no sync, no auth) under the constitution (v3.0.0): **Local-First**
(Principle I), **cheap by default** (V), and **simplicity over framework magic**
(VII). A backend (Supabase) is deferred to a later phase.

---

## Decision 1: Local data store

**Decision**: **IndexedDB via Dexie** is the single source of truth. The UI reads
through live queries (`dexie-react-hooks` `useLiveQuery`) so it re-renders on any
local change; writes go straight to Dexie.

**Rationale**:
- Survives reloads/restarts (FR-004, SC-005); handles hundreds of rows trivially.
- Structured queries + indexes give the required ordering (FR-005) cheaply.
- Reactive hooks keep the UI in sync with no extra state plumbing.
- No backend, no cost (Principle V), no framework magic (Principle VII).

**Alternatives considered**:
- `localStorage` — string-only, no indexes/queries, easy to corrupt with manual
  JSON. Rejected.
- Raw IndexedDB API — verbose and error-prone; Dexie is a thin, well-proven
  wrapper, not a heavy framework. Acceptable under Principle VII.
- SQLite-wasm / sql.js — real SQL locally, but heavier bundle and persistence
  ceremony than a few hundred tasks justify. Rejected as over-engineering.

## Decision 2: PWA / offline shell

**Decision**: `vite-plugin-pwa` (Workbox) precaches the app shell and assets so
the app is installable and launches with no network. Since all data is local
already, the service worker only handles the static shell — there are no API
responses to cache.

**Rationale**: Satisfies Local-First (Principle I) with the minimum moving parts;
no runtime caching rules to reason about.

## Decision 3: Project shape, language, testing

**Decision**:
- A **single Vite + React + TypeScript app** managed with **pnpm**. No monorepo
  packages yet — a `packages/shared` is introduced only when a second consumer
  exists (Principle VII). Domain types live in the app's `src/domain`.
- **TypeScript strict** throughout (Principle II). No SQL in this phase.
- **No backend code** — no Supabase client, no Edge Functions, no migrations.
- **Testing**: Vitest for domain logic (completion state transitions, list
  ordering) — **test-first per Principle IV**; Playwright for end-to-end,
  including a reload-persistence scenario.

**Rationale**: Smallest structure that delivers the feature; leaves room to grow
into workspaces when the backend phase arrives, without paying for it now.

## Deferred to a later phase (when multi-device/multi-user is specced)

- Backend (Supabase: Postgres, Auth, Realtime) and the device→backend sync layer.
- An **outbox queue + last-write-wins** sync mechanism (the earlier design) —
  reintroduced only once there is a backend to sync to.
- **Owner identifier + RLS** (Principle VIII) — added with the backend migration
  and backfilled onto existing local data in one step.
- Authentication (anonymous sign-ins → SSO) per the earlier auth discussion.

---

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Where data lives | IndexedDB via Dexie (device is source of truth) |
| Reactive UI reads | `useLiveQuery` over Dexie |
| Offline shell | vite-plugin-pwa precache; no API caching (no API) |
| Backend / sync | None this phase; deferred to a future amendment |
| Owner / multi-tenant | Dropped now; Principle VIII dormant until backend |
| Project structure | Single pnpm-managed Vite app; no shared package yet |
| Test approach | Vitest (test-first domain logic) + Playwright e2e |

No `NEEDS CLARIFICATION` items remain.
