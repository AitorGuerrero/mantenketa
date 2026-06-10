# Implementation Plan: Family Nucleus, Invitations & Sign-In

**Branch**: `002-family-nucleus` | **Date**: 2026-06-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-family-nucleus/spec.md`

## Summary

Add optional SSO sign-in (Supabase Auth, Google), family nuclei with
single-use invitation links, and nucleus-scoped task sharing — while keeping
the app local-first: Dexie/IndexedDB remains the only read/write path for the
UI, and a new sync layer (outbox push + initial pull + Realtime, last-write-
wins by `updatedAt`) keeps devices and members converged. Postgres with RLS
enforces tenant isolation (Principle VIII); invitation acceptance and leaving
run as atomic RPCs. Pre-auth local tasks are backfilled to the signing-in user
and uploaded (FR-003 / SC-001).

See [research.md](./research.md) for decisions, [data-model.md](./data-model.md)
for the schema (Postgres + Dexie v2), and [contracts/](./contracts/) for the
client services and backend surface the UI binds to.

## Technical Context

**Language/Version**: TypeScript 5.x (strict) everywhere; Node 20 tooling

**Primary Dependencies**: React 18, Vite, vite-plugin-pwa, Dexie +
dexie-react-hooks, Zod, **@supabase/supabase-js** (Auth, Postgres, Realtime)

**Storage**: Browser IndexedDB via Dexie (UI source of truth) **+ Supabase
Postgres** (system of record for signed-in users; RLS-isolated). All SQL in
`supabase/migrations`; row types generated.

**Testing**: Vitest (unit — reconcile/adoption/invitation-state logic,
test-first), Vitest integration vs local Supabase (RLS isolation, Principle
IV), Playwright (e2e incl. offline + two-browser sharing)

**Target Platform**: Modern evergreen browsers as an installable PWA

**Project Type**: Static SPA (Cloudflare Pages) + Supabase project (no custom
server code beyond SQL RPCs)

**Performance Goals**: local reads stay instant; nucleus changes visible to
online members ≤ 5 s (SC-003); post-sign-in full pull ≤ 10 s (SC-005)

**Constraints**: fully usable offline for task flows (Principle I);
account/nucleus management online-only with clear messaging; zero fixed
monthly cost (Principle V — Supabase free tier + Pages)

**Scale/Scope**: one household (≤ ~10 members), a few thousand task rows

## Constitution Check

*(Evaluated against Constitution v4.0.0.)*

| # | Principle | Status | How this plan complies |
|---|-----------|--------|------------------------|
| I | Local-First | ✅ PASS | Dexie stays the only UI read/write path; sync is additive (outbox+pull+realtime). Task flows work offline; nucleus management fails offline with a clear message. Spec's Offline Behavior defines per-entity conflict rules. |
| II | One Language, One Type System | ✅ PASS | TS strict; SQL only in `supabase/migrations`; row types generated to `database.types.ts` and mapped to domain types at one boundary. |
| III | Spec Before Code | ✅ PASS | spec.md (checklist 16/16) + this plan precede implementation. |
| IV | Test-First for Domain Logic | ✅ PASS | Failing-first unit tests for: LWW reconcile, pre-auth adoption, invitation validity. RLS isolation covered by two-user integration tests before completion. |
| V | Cheap by Default | ✅ PASS | Supabase free tier + Cloudflare Pages; no always-on paid compute. |
| VI | Single Deployable Environment | ✅ PASS | One Pages production + one Supabase project from `main`; local dev may use `supabase start`. |
| VII | Simplicity Over Framework Magic | ✅ PASS | No CRDT/sync engine; one ~small sync module with pure reconcile logic; RPCs only where invariants must be atomic. |
| VIII | Tenant-Ready Data Model | ✅ PASS | `owner_id` (+ optional `nucleus_id`) on tasks from their first migration; one-time local backfill at first sign-in; RLS on every table, tested. |

**Result**: All gates pass → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-family-nucleus/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (Postgres + Dexie v2 + domain types)
├── quickstart.md        # Phase 1 output (Supabase setup + env + commands)
├── contracts/
│   ├── client-services.md   # AuthService / NucleusService / TaskRepository changes / SyncEngine
│   └── backend.md           # Tables, RLS policies, RPCs (contract for migrations)
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── domain/            # task.ts (+ownerId/nucleusId/completedBy/updatedAt),
│   │                      #   reconcile.ts, adoption.ts — test-first
│   ├── data/
│   │   ├── db.ts              # Dexie v2 (+outbox, meta)
│   │   ├── taskRepository.ts  # unchanged contract + scope + outbox enqueue
│   │   ├── supabaseClient.ts  # createClient (env)
│   │   ├── database.types.ts  # GENERATED row types (do not edit)
│   │   └── sync/              # outbox flusher, puller, realtime subscription
│   ├── auth/              # session hook, sign-in/out, first-sign-in adoption
│   ├── components/        # AuthMenu, NucleusPanel, InviteDialog, scope toggle…
│   └── pages/
└── tests/
    ├── e2e/               # + auth-mocked flows, two-context sharing
    └── integration/       # RLS isolation tests (vs local Supabase)

supabase/
├── config.toml
└── migrations/            # ALL SQL lives here (Principle II)
```

**Structure Decision**: still a single deployable app; `supabase/` holds only
declarative SQL + CLI config (no server runtime code). No shared package —
one consumer (Principle VII).

## Complexity Tracking

> No constitution violations — no entries required.
