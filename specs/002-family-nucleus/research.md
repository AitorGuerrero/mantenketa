# Phase 0 Research: Family Nucleus, Invitations & Sign-In

**Feature**: 002-family-nucleus · **Date**: 2026-06-11

Resolves the technical unknowns for the multi-user phase under Constitution
v4.0.0: **Local-First with sync** (I), **Supabase backend** (stack), **RLS
isolation** (VIII), **cheap by default** (V), **simplicity** (VII).

---

## Decision 1: Authentication

**Decision**: **Supabase Auth with the Google OAuth provider** (PKCE flow via
`supabase-js`). No app-managed passwords (FR-001). Sign-in is optional: the
app keeps working anonymously in local-only mode (FR-002); the session, when
present, unlocks sync + nucleus features.

**Rationale**: One trusted SSO provider covers the household; Supabase Auth is
free tier, integrates with RLS (`auth.uid()`), and `signInWithOAuth` is a few
lines. Adding more providers later is configuration, not architecture.

**Alternatives considered**:
- Email+password — app-managed credentials; explicitly excluded by the spec.
- Magic links — viable fallback, but e-mail deliverability setup (SMTP) adds
  moving parts; deferred until someone in the family lacks a Google account.
- Supabase anonymous sign-ins upgraded to identities — extra states to manage;
  our "anonymous = purely local, no backend" model is simpler (Principle VII).

## Decision 2: Sync — outbox push + realtime/pull, LWW

**Decision**: Dexie remains the only read/write path for the UI. A sync layer
is added beside it:

- **Push (outbox)**: every local task write by a signed-in user also enqueues
  an entry in a Dexie `outbox` table. A flusher drains it whenever there is a
  session + connectivity (on auth, on `online`, after each write), upserting
  rows to Postgres. Server-side LWW: a trigger applies an incoming write only
  if its `updated_at` is newer than the stored row's.
- **Pull**: on sign-in (and on reconnect) a full pull of all rows visible to
  the user (RLS does the scoping) reconciles Dexie; afterwards a **Realtime
  `postgres_changes` subscription** (which honors RLS) applies live changes
  from other members (SC-003 ≤ 5 s).
- **Conflict rule (Principle IV — test-first)**: per task, last-write-wins by
  client-set `updatedAt`; completion idempotence preserved (a "complete"
  arriving over an already-completed task keeps the earlier completion only if
  newer-write says otherwise — pure reconcile function, unit-tested).

**Rationale**: This is the outbox+LWW design v3.0.0 deferred. It keeps reads
instant and offline (Principle I) and confines all sync complexity to one
module with pure, testable reconcile logic.

**Alternatives considered**:
- Reading straight from Supabase when online — violates Principle I (two read
  paths, breaks offline). Rejected.
- CRDT libraries (Yjs/Automerge) — heavy machinery for a list of small rows
  with trivial merge semantics. Rejected (Principle VII).
- Sync engines (PowerSync, ElectricSQL) — extra service/cost and framework
  magic; outbox+LWW is ~200 lines we fully control. Rejected for now.

## Decision 3: Tenant model and RLS (Principle VIII)

**Decision**: Postgres tables `profiles`, `nuclei`, `memberships` (UNIQUE on
`user_id` → one nucleus per user, FR-007), `invitations`, and `tasks` with
`owner_id` (always set) + `nucleus_id` (nullable → personal vs nucleus scope).
RLS on everything:

- `tasks`: readable/writable when `owner_id = auth.uid()` **or** `nucleus_id`
  is one of the caller's memberships.
- `invitations` are never listed by token-holders; **acceptance goes through a
  `SECURITY DEFINER` RPC** `accept_invitation(token)` that validates
  pending/not-expired/single-use/not-already-in-a-nucleus atomically.
- `leave_nucleus()` RPC removes the membership and dissolves the nucleus
  (cascading its tasks) when the last member leaves (FR-013).

**Rationale**: Cross-tenant leakage is the worst failure mode (Principle
VIII); RPCs keep multi-row invariants (single-use, last-member dissolution)
atomic in one place instead of scattered client logic.

**Alternatives considered**: enforcing isolation in client queries only —
prohibited by Principle VIII. Invitation rows readable by token via RLS —
subtle leak surface; an RPC validates without granting SELECT.

## Decision 4: Adoption of pre-auth tasks (FR-003)

**Decision**: local tasks carry `ownerId: null` while anonymous. On first
sign-in, a one-time backfill stamps `ownerId = user.id` on every local task
and enqueues them all in the outbox. Pull then merges any server-side tasks.

**Rationale**: implements the constitution's "one-time backfill" clause with
no data migration on the server side; 100% preservation (SC-001) is testable
locally.

## Decision 5: Local schema migration (Dexie v2)

**Decision**: `db.version(2)`: `tasks` gains `ownerId`, `nucleusId`,
`completedBy`, `updatedAt`; new `outbox` and `meta` stores. Dexie's `upgrade()`
stamps `updatedAt = createdAt` and null owner/nucleus on existing rows.

## Decision 6: RLS / isolation tests (Principle IV)

**Decision**: integration tests in Vitest against a **locally running Supabase**
(`supabase start`, Docker) — seed two users with the service role, then assert
with two authenticated clients that personal tasks never cross users and
nucleus tasks are visible only to members. pgTAP rejected (second test
toolchain; Principle VII). These tests run on demand (`test:rls`), not in the
default unit run.

## Decision 7: Project structure & config

**Decision**: keep the single app `apps/web`; add a top-level `supabase/`
directory (CLI config + `migrations/`). Generated DB types land in
`apps/web/src/data/database.types.ts` (the one explicit boundary, Principle
II). Runtime config via `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
(publishable values, safe in the client; `.env.example` committed). No
`packages/shared` yet — still one consumer.

---

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Auth method | Supabase Auth, Google OAuth (PKCE), optional sign-in |
| Sync | Outbox push + initial pull + Realtime `postgres_changes`; LWW by `updatedAt` |
| Conflict logic | Pure reconcile function, test-first (Principle IV) |
| Isolation | `owner_id`/`nucleus_id` + RLS; RPCs for invitation/leave invariants |
| Pre-auth tasks | Local backfill of `ownerId` on first sign-in + outbox enqueue |
| Local schema | Dexie v2 upgrade (new fields + `outbox`/`meta` stores) |
| RLS tests | Vitest integration vs local Supabase (Docker), two-user assertions |
| Structure | `apps/web` + `supabase/migrations`; generated row types at one boundary |

No `NEEDS CLARIFICATION` items remain.
