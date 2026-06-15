# Phase 1 Data Model: Multiple Groups per User

Generalizes the feature-002 model from one nucleus per user to many. Only the
deltas from 002 are described; unchanged columns are noted as such.

## Entities

### Group (table `public.nuclei` — unchanged shape)

A named set of users who share tasks. Generalizes the "family nucleus".

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| name | text | not null, `btrim(name) <> ''`; **not required unique** |
| created_at | timestamptz | default now() |

- A user may belong to **many** groups (was: at most one).
- Dissolved (row + cascades) when its last member leaves.

### Membership (table `public.memberships`)

The link between a user and a group.

| Field | Type | Notes |
|-------|------|-------|
| nucleus_id | uuid | FK → nuclei, on delete cascade |
| user_id | uuid | FK → profiles, on delete cascade |
| since | timestamptz | default now() |
| **PK** | (nucleus_id, user_id) | prevents double-join of the same group |

**DELTA**: drop `unique (user_id)`. A user now has one row per group they belong
to. The composite PK still blocks joining the same group twice.

### Invitation (table `public.invitations` — unchanged shape)

A pending offer to join one specific group.

| Field | Type | Notes |
|-------|------|-------|
| token | uuid PK | shareable link id |
| nucleus_id | uuid | FK → nuclei, the target group |
| created_by | uuid | FK → profiles |
| created_at | timestamptz | default now() |
| expires_at | timestamptz | default now() + 7 days |
| status | text | `pending` / `accepted` / `revoked` |
| accepted_by | uuid | FK → profiles, nullable |

- No per-user uniqueness; accepting grants membership of `nucleus_id` only.

### Task (table `public.tasks` — unchanged shape)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | client-generated |
| owner_id | uuid | FK → profiles; the creator |
| nucleus_id | uuid? | FK → nuclei nullable; **null = personal, set = that one group** |
| name | text | not null, non-blank |
| task_date | date? | nullable ("hacer ya") |
| completed_at | date? | nullable |
| completed_by | uuid? | FK → profiles |
| description | text? | nullable (feat 005) |
| urgent | boolean | default false (feat 007) |
| created_at / updated_at | timestamptz | LWW clock |

**No shape change.** A task still belongs to at most one scope; with N groups,
`nucleus_id` simply identifies *which* of the user's groups (chosen at creation).

## Domain types (client, `apps/web/src/domain/task.ts`)

- `Task` (Zod) — unchanged fields; `nucleusId: string | null` already exists.
- **DELTA `NewTaskInput`**: replace `scope: 'personal' | 'nucleus'` with
  `nucleusId: string | null` (default `null` = personal). `parseNewTask`
  normalizes and trims; the chosen group id is passed straight through.
  - `TaskScopeSchema`/`TaskScope` enum is removed (no other consumers after the
    form changes).

## Client cache types (`apps/web/src/data/nucleusService.ts`)

- **DELTA**: `NucleusView` (single) → `GroupView` reused in a **list**:
  ```ts
  interface GroupMember { userId: string; displayName: string }
  interface GroupInvitation { token: string; expiresAt: string; status: string }
  interface GroupView {
    id: string
    name: string
    members: GroupMember[]
    pendingInvitations: GroupInvitation[]
  }
  ```
- Cached under Dexie meta `GROUPS_KEY = 'groups'` as `GroupView[]`.
- Service surface:
  - `observeGroups(): Observable<GroupView[]>`
  - `currentGroupIds(): Promise<string[]>`
  - `createGroup(name: string): Promise<void>`
  - `createInvitation(nucleusId: string): Promise<{ token: string }>`
  - `acceptInvitation(token: string): Promise<void>`
  - `leaveGroup(nucleusId: string): Promise<void>`

## Local store (`apps/web/src/data/db.ts`)

- **DELTA**: Dexie **v5**. No object-store schema change (the `tasks` store and
  `nucleus_id` index are unchanged). The upgrade only **deletes the stale
  `NUCLEUS_KEY` meta entry** if present; `GROUPS_KEY` is populated by the next
  `refreshGroups()`.

## State & validation rules

- A task's scope is fixed at creation; `nucleus_id` never changes (no
  cross-group conflict possible on sync).
- Insert is accepted only if `nucleus_id` is null or one of the user's groups
  (RLS `tasks_insert` check).
- Read visibility: `owner_id = me` OR `nucleus_id ∈ my groups` (RLS
  `tasks_select`).
- Leaving a group removes the membership row; if it was the last, the group row
  is deleted and cascades remove its tasks and invitations.

## Relationships

```text
profile 1 ──< membership >── 1 nucleus(group)        (many-to-many; was 1:≤1)
nucleus 1 ──< invitation                              (per-group invites)
profile 1 ──< task        (owner_id)
nucleus 0..1 ──< task     (nucleus_id; null = personal)
```
