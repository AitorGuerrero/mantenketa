# Phase 1 Data Model: Family Nucleus, Invitations & Sign-In

**Feature**: 002-family-nucleus · **Date**: 2026-06-11

Two coordinated schemas: **Postgres** (system of record for signed-in users,
RLS-isolated) and **Dexie v2** (the device store the UI reads/writes). Domain
types stay defined once in `apps/web/src/domain` (Principle II); generated row
types are mapped to them at one boundary.

## Postgres (supabase/migrations)

### Tables

**profiles** — one row per account (filled from the identity provider on sign-up trigger)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `= auth.users.id` |
| `display_name` | `text` | from provider metadata |
| `email` | `text` | from provider |
| `created_at` | `timestamptz` | default `now()` |

**nuclei**

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK default `gen_random_uuid()` | |
| `name` | `text` NOT NULL CHECK (non-blank) | FR-006 |
| `created_at` | `timestamptz` | |

**memberships**

| Column | Type | Notes |
|--------|------|-------|
| `nucleus_id` | `uuid` FK → nuclei ON DELETE CASCADE | |
| `user_id` | `uuid` FK → profiles | **UNIQUE** → one nucleus per user (FR-007) |
| `since` | `timestamptz` | default `now()` |

PK `(nucleus_id, user_id)`.

**invitations**

| Column | Type | Notes |
|--------|------|-------|
| `token` | `uuid` PK default `gen_random_uuid()` | the shareable secret (link = `/invitacion/<token>`) |
| `nucleus_id` | `uuid` FK → nuclei ON DELETE CASCADE | invitation belongs to the nucleus, not the inviter |
| `created_by` | `uuid` FK → profiles | |
| `created_at` | `timestamptz` | |
| `expires_at` | `timestamptz` | `created_at + interval '7 days'` (FR-008) |
| `status` | `text` CHECK in (`pending`,`accepted`,`revoked`) | single-use: flips to `accepted` atomically |
| `accepted_by` | `uuid` NULL | set on acceptance |

Expired = `status = 'pending' AND expires_at < now()` (derived, no cron).

**tasks** — extends feature 001's entity (Principle VIII: owner from first migration)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | client-generated (same id as local row) |
| `owner_id` | `uuid` NOT NULL FK → profiles | creator |
| `nucleus_id` | `uuid` NULL FK → nuclei ON DELETE CASCADE | NULL ⇒ personal; set ⇒ nucleus task (FR-014). Fixed at creation. |
| `name` | `text` NOT NULL CHECK (non-blank) | |
| `task_date` | `date` NULL | NULL ⇒ "hacer ya" (feature 001 amendment) |
| `completed_at` | `date` NULL | |
| `completed_by` | `uuid` NULL FK → profiles | who completed it (FR-016) |
| `created_at` | `timestamptz` NOT NULL | |
| `updated_at` | `timestamptz` NOT NULL | LWW clock, client-set |

LWW trigger: `BEFORE INSERT OR UPDATE` — on conflict/update, keep the stored
row unless `NEW.updated_at > OLD.updated_at` (sync contract; unit-tested
client-side, trigger-tested in RLS suite).

### RLS (all tables: `ENABLE ROW LEVEL SECURITY`; no table readable by `anon`)

- `profiles`: user reads/updates own row; members read rows of fellow members
  (for the member list).
- `nuclei`: visible to its members only; INSERT allowed to any authenticated
  user (creator RPC also inserts the first membership atomically).
- `memberships`: visible to members of the same nucleus; mutations only via
  RPCs.
- `invitations`: SELECT only to members of the nucleus (pending list, FR-011);
  INSERT by members; UPDATE (revoke) by members. Acceptance NEVER via direct
  table access — only the RPC sees a row by token.
- `tasks`: `owner_id = auth.uid() OR nucleus_id IN (SELECT nucleus_id FROM
  memberships WHERE user_id = auth.uid())` for SELECT/INSERT/UPDATE (WITH
  CHECK the same). No DELETE policy (deletion out of scope; cascade only).

### RPCs (SECURITY DEFINER, atomic invariants)

- `create_nucleus(p_name text) → uuid` — inserts nucleus + first membership;
  fails if caller already has a membership.
- `accept_invitation(p_token uuid) → uuid` — validates `pending`, not expired,
  caller has no nucleus, not already member; flips status to `accepted`,
  inserts membership. Returns nucleus id. Clear error codes for each failure
  (FR-009/FR-010, edge cases).
- `leave_nucleus() → void` — deletes caller's membership; if it was the last,
  deletes the nucleus (cascades nucleus tasks + invitations) (FR-012/FR-013).

## Dexie v2 (apps/web/src/data/db.ts)

```text
db.version(2).stores({
  tasks: 'id, taskDate, completedAt, createdAt, updatedAt, nucleusId',
  outbox: '++seq, taskId',     // pending pushes, FIFO
  meta: 'key',                  // session/user snapshot, lastPulledAt
}).upgrade(tx => stamp existing tasks: ownerId=null, nucleusId=null,
            completedBy=null, updatedAt=createdAt)
```

## Domain types (apps/web/src/domain)

`Task` gains: `ownerId: string | null` (null only while anonymous),
`nucleusId: string | null`, `completedBy: string | null`,
`updatedAt: string` (ISO). Every local write sets `updatedAt = now`.

New pure, test-first logic (Principle IV):

- `reconcile(local: Task | undefined, remote: Task): Task` — LWW by
  `updatedAt`; deterministic tiebreak (lexicographic id) on equal stamps.
- `adoptLocalTasks(tasks, userId)` — stamps `ownerId` on ownerless tasks
  (first sign-in backfill, FR-003).
- `invitationState(inv, now)` — `pending | accepted | revoked | expired`
  (drives UI messages, FR-010).

## State transitions

Task completion transitions are unchanged from feature 001, with one
extension: `markDone` also records `completedBy` (the signing member) and
bumps `updatedAt`; `revert` clears both `completedAt` and `completedBy`.

Invitation: `pending → accepted` (RPC, single-use) · `pending → revoked`
(member action) · `pending → expired` (time-derived, terminal).
