# Contract: Groups, Membership & Scoped Tasks (feature 008)

Generalizes the feature-002 nucleus contract to N groups per user. Surfaces:
the Supabase RPCs + RLS (server) and the client data-access service. Only deltas
from 002 are normative here; everything else is inherited unchanged.

## Server: RLS visibility helper

```sql
-- was: my_nucleus_id() returns uuid (scalar, one group)
create or replace function public.my_nucleus_ids()
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select nucleus_id from public.memberships where user_id = auth.uid()
$$;
```

**Contract**:
- Returns every group id the caller currently belongs to (0..N rows).
- Used by all group-scoped SELECT/INSERT/UPDATE policies via
  `… in (select public.my_nucleus_ids())`.

## Server: RLS policies (predicates)

| Policy | Predicate (after) |
|--------|-------------------|
| `nuclei_select` | `id in (select public.my_nucleus_ids())` |
| `memberships_select` | `nucleus_id in (select public.my_nucleus_ids())` |
| `invitations_select` | `nucleus_id in (select public.my_nucleus_ids())` |
| `tasks_select` | `owner_id = auth.uid() or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))` |
| `tasks_insert` (check) | `owner_id = auth.uid() and (nucleus_id is null or nucleus_id in (select public.my_nucleus_ids()))` |
| `tasks_update` (using/check) | same membership predicate as `tasks_select` |

**Isolation guarantees (must be tested — Principle VIII)**:
- A user reads tasks of *all* groups they belong to + their own personal tasks.
- A non-member of group G can never read or write G's tasks/rows.
- Membership in ≥2 groups is allowed (no `unique(user_id)`).

## Server: RPCs

### `create_group(p_name text) returns uuid`  *(was `create_nucleus`)*

- Pre: caller authenticated; `btrim(p_name) <> ''`.
- Effect: insert a `nuclei` row + a `memberships` row for the caller.
- **DELTA**: no `already_in_nucleus` check — a user may create any number of
  groups.
- Returns: new group id.
- Errors: `unauthenticated`, `blank_name`.

### `accept_invitation(p_token uuid) returns uuid`

- Pre: caller authenticated; token exists, `status = 'pending'`, not expired.
- Effect: insert a `memberships` row for the caller in the invitation's group;
  mark invitation `accepted`, set `accepted_by`.
- **DELTA**: no global `already_in_nucleus` check. If the caller is already a
  member of **that** group, return/raise `already_member` and DO NOT consume the
  invitation (FR-014).
- Returns: the joined group id.
- Errors: `unauthenticated`, `invalid_token`, `expired`, `revoked`,
  `already_used`, `already_member`.

### `leave_group(p_nucleus_id uuid) returns void`  *(was `leave_nucleus()`)*

- Pre: caller authenticated and a member of `p_nucleus_id`.
- Effect: delete the caller's membership of that group. If it was the last
  member, delete the group (cascades remove its tasks + invitations).
- **DELTA**: now takes the group id (a user has several).
- Errors: `unauthenticated`, `not_a_member`.

### `create_invitation(p_nucleus_id uuid) returns uuid` *(token)*

- Pre: caller is a member of `p_nucleus_id`.
- Effect: insert a `pending` invitation for that group (7-day expiry).
- Returns: token.
- Errors: `unauthenticated`, `not_a_member`.

## Client: data-access service (`nucleusService.ts`)

```ts
observeGroups(): Observable<GroupView[]>      // live list of the user's groups
currentGroupIds(): Promise<string[]>          // ids only
createGroup(name: string): Promise<void>
createInvitation(nucleusId: string): Promise<{ token: string }>
acceptInvitation(token: string): Promise<void>
leaveGroup(nucleusId: string): Promise<void>
```

**Contract**:
- `observeGroups` emits `[]` when the user belongs to no group (incl. anonymous).
- `refreshGroups()` rebuilds the cached `GroupView[]` from `nuclei` +
  `memberships` + `invitations` (RLS-scoped) — replacing the old "take row[0]".
- Group-management calls require connectivity and throw a typed offline/error
  result (unchanged behavior from 002), never silently queue.

## Client: task creation (`taskRepository.createTask`)

```ts
createTask(input: NewTaskInput): Promise<Task>
// NewTaskInput.nucleusId: string | null   (null = personal, the default)
```

**Contract**:
- Writes `nucleus_id = input.nucleusId` directly (no `currentNucleusId()`).
- The form only offers groups the user belongs to; RLS is the backstop.
- Anonymous/local-only: `nucleusId` is always `null`.

## Client: UI labeling

- `TaskItem` shows a scope badge: the owning group's **name** (by `nucleusId`),
  or "Personal" for `null` — **only when the user belongs to ≥1 group**.
- `groupName(nucleusId)` and `memberName(userId)` resolve across the union of all
  cached groups.

## Compatibility

- Existing single-nucleus rows need **no data migration**: dropping
  `unique(user_id)` leaves each current user with exactly one group (FR-005).
- `nucleus_id` column/field name retained intentionally (see research.md
  Decision 8); user-facing term is "grupo".
