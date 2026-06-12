---
description: "Task list for feature 002 — Family Nucleus, Invitations & Sign-In"
---

# Tasks: Family Nucleus, Invitations & Sign-In

**Input**: Design documents from `/specs/002-family-nucleus/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Constitution v4.0.0 Principle IV mandates failing-first unit tests
for **sync conflict resolution (reconcile)**, **pre-auth adoption**, and
**invitation state** logic, and RLS **isolation tests** before the feature is
complete. UI/config are exempt from test-first but covered by e2e.

**Organization**: by user story. Stack: `apps/web` PWA + `supabase/`
migrations. External prerequisite: a Supabase project + Google OAuth
credentials (see quickstart.md); local dev uses `supabase start` (Docker).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Add `@supabase/supabase-js` to `apps/web`; create `supabase/config.toml` via `supabase init`; add `apps/web/.env.example` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) and ensure `.env*` stays gitignored
- [X] T002 [P] Add scripts: `test:rls` (Vitest, `tests/integration`, sequential) in `apps/web/package.json`; document type generation command in `apps/web/README.md` section
- [X] T003 [P] Create `apps/web/src/data/supabaseClient.ts` — `createClient` from env; exports `supabaseEnabled` flag (no env ⇒ pure local-only mode, FR-002)

---

## Phase 2: Foundational (blocks all stories)

- [X] T004 Migration `supabase/migrations/0001_family_nucleus.sql`: tables `profiles` (+ sign-up trigger from auth.users), `nuclei`, `memberships` (UNIQUE user_id), `invitations`, `tasks` (owner_id, nucleus_id, completed_by, updated_at) per data-model.md; LWW `BEFORE UPDATE` trigger on tasks
- [X] T005 Migration (same file): RLS policies for all five tables + RPCs `create_nucleus`, `accept_invitation`, `leave_nucleus` per contracts/backend.md (SECURITY DEFINER, pinned search_path, error codes)
- [X] T006 Generate `apps/web/src/data/database.types.ts` (`supabase gen types typescript --local`) and verify it compiles
- [X] T007 Extend `Task` domain type + Zod (`ownerId`, `nucleusId`, `completedBy`, `updatedAt`) in `apps/web/src/domain/task.ts`; every write path stamps `updatedAt`
- [X] T008 Dexie v2 in `apps/web/src/data/db.ts`: new indexes + `outbox`/`meta` stores + `upgrade()` backfilling existing rows per data-model.md

**Checkpoint**: schema + types ready locally and remotely

---

## Phase 3: US1 — Sign in and keep my tasks (P1) 🎯 MVP

### Tests first (must FAIL) ⚠️

- [X] T009 [P] [US1] Failing unit tests for `reconcile()` (LWW by updatedAt, id tiebreak, completion idempotence across replicas) in `apps/web/src/domain/reconcile.test.ts`
- [X] T010 [P] [US1] Failing unit tests for `adoptLocalTasks()` (stamps ownerless tasks only; preserves content; idempotent — FR-003/SC-001) in `apps/web/src/domain/adoption.test.ts`
- [X] T011 [P] [US1] Failing e2e: anonymous mode unaffected (feature 001 suite still green with no env); sign-in adopts local tasks (auth mocked/stubbed session) in `apps/web/tests/e2e/auth-adoption.spec.ts`

### Implementation

- [X] T012 [US1] Implement `reconcile()` and `adoptLocalTasks()` in `apps/web/src/domain/` (makes T009, T010 pass)
- [X] T013 [US1] `AuthService` in `apps/web/src/auth/authService.ts`: `observeSession` (Dexie `meta` cache), `signInWithGoogle` (PKCE redirect), `signOut` with outbox warning (FR-005); first-sign-in adoption hook
- [X] T014 [US1] Sync engine in `apps/web/src/data/sync/`: outbox enqueue on every signed-in write (extend `taskRepository.ts`), FIFO flusher (session+online triggers), full pull on sign-in/reconnect feeding `reconcile`, Realtime `postgres_changes` subscription
- [X] T015 [P] [US1] `AuthMenu` component (Iniciar sesión con Google / sesión / Cerrar sesión with pending-changes warning) wired into `App.tsx` — UI in castellano
- [X] T016 [US1] RLS integration tests (personal-task isolation: guarantees 1 and 3 of contracts/backend.md) in `apps/web/tests/integration/rls-personal.test.ts` (vs local Supabase)

**Checkpoint**: sign in → tasks adopted, synced, multi-device; anonymous unaffected

---

## Phase 4: US2 — Create a nucleus and invite my family (P2)

### Tests first (must FAIL) ⚠️

- [X] T017 [P] [US2] Failing unit tests for `invitationState()` (pending/accepted/revoked/expired derivation — FR-010) in `apps/web/src/domain/invitation.test.ts`
- [X] T018 [P] [US2] RLS/RPC integration tests: accept happy path, expired/revoked/already-used/already-in-nucleus errors, leave + last-member dissolution (guarantees 2, 4, 5) in `apps/web/tests/integration/rls-nucleus.test.ts`

### Implementation

- [X] T019 [US2] Implement `invitationState()` in `apps/web/src/domain/invitation.ts` (makes T017 pass)
- [X] T020 [US2] `NucleusService` in `apps/web/src/data/nucleusService.ts` per contracts/client-services.md (RPC calls, typed errors, OfflineError when no connectivity, `meta` cache for `observeNucleus`)
- [X] T021 [P] [US2] Nucleus UI: `NucleusPanel` (crear núcleo, miembros, invitaciones pendientes con revocar, abandonar with FR-013 warning) in `apps/web/src/components/NucleusPanel.tsx`
- [X] T022 [P] [US2] Invitation accept route `/invitacion/:token` (path handling in `App.tsx`; `_redirects` already SPA-falls-back): sign-in-first flow, accept, per-cause error messages in castellano, in `apps/web/src/pages/InvitationPage.tsx`
- [X] T023 [US2] e2e: create nucleus → invite → second context accepts → member list on both; revoked/expired messages, in `apps/web/tests/e2e/nucleus-invite.spec.ts`

**Checkpoint**: two accounts can form a nucleus via invitation link

---

## Phase 5: US3 — Share tasks with the nucleus (P3)

- [X] T024 [P] [US3] Failing e2e: nucleus task created in context A appears in context B ≤ 5 s; B completes → A sees completed + who (SC-003), in `apps/web/tests/e2e/nucleus-tasks.spec.ts`
- [X] T025 [US3] Scope selector in `CreateTaskForm.tsx` («Personal» / «Del núcleo», default personal, visible only with nucleus — FR-014); repository persists `nucleusId`
- [X] T026 [US3] `TaskList.tsx`: show completing member on nucleus tasks («Hecha el … por …»); `markDone` records `completedBy` (FR-016)

**Checkpoint**: full sharing loop converges across members

---

## Phase 6: Polish & Cross-Cutting

- [X] T027 [P] Offline affordances: OfflineError messages on nucleus actions; subtle pending-sync indicator (outbox count) in the footer
- [X] T028 [P] SPDX headers on new files; README + quickstart sync (env vars, `supabase db push`, Google provider setup)
- [X] T029 Full validation: unit + `test:rls` + e2e suites green; quickstart steps 1–6 verified; feature 001 e2e regression-free in anonymous mode

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → stories. US2 depends on US1 (session); US3 on US1+US2.
- Test-first pairs: T009/T010 → T012 · T017 → T019; e2e/RLS tests may be
  written alongside but MUST fail before their implementation lands.
- External blocker for anything beyond unit tests: a running Supabase (local
  `supabase start` for dev/RLS tests; production project + Google OAuth for
  deploy).

## Implementation Strategy

US1 alone is a shippable increment (multi-device personal tasks). Deploy after
each story checkpoint. Total: 29 tasks (Setup 3, Foundational 5, US1 8,
US2 7, US3 3, Polish 3).
