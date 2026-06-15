# Phase 0 Research: Multiple Groups per User

All unknowns are about *how to generalize the existing single-nucleus design*,
since feature 002 already established the stack, RLS pattern and sync. No new
technologies are introduced.

## Decision 1: Remove the one-nucleus constraint at the data layer

**Decision**: Drop `unique (user_id)` from `public.memberships`. A user may have
one membership row per group. The composite primary key `(nucleus_id, user_id)`
already prevents duplicate membership of the *same* group.

**Rationale**: This single constraint is the hard enforcement of "one nucleus per
user". Removing it is necessary and sufficient at the schema level; the rest is
RLS/RPC logic that referenced it.

**Alternatives considered**: A separate join model or a "primary group" flag —
rejected; adds concepts the spec explicitly excludes (no active group, flat
membership).

## Decision 2: Scalar RLS helper → set-returning `my_nucleus_ids()`

**Decision**: Replace
```sql
create function public.my_nucleus_id() returns uuid ...
  select nucleus_id from memberships where user_id = auth.uid()
```
with
```sql
create function public.my_nucleus_ids() returns setof uuid
  language sql stable security definer set search_path = '' as $$
    select nucleus_id from public.memberships where user_id = auth.uid()
  $$;
```
and rewrite every policy predicate that used `= public.my_nucleus_id()` to
`in (select public.my_nucleus_ids())`:
- `nuclei_select`:        `id in (select public.my_nucleus_ids())`
- `memberships_select`:   `nucleus_id in (select public.my_nucleus_ids())`
- `invitations_select`:   `nucleus_id in (select public.my_nucleus_ids())`
- `tasks_select`:         `owner_id = auth.uid() or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))`
- `tasks_insert` check:   `owner_id = auth.uid() and (nucleus_id is null or nucleus_id in (select public.my_nucleus_ids()))`
- `tasks_update`:         same membership predicate as select.

**Rationale**: A `setof uuid` used with `in (select …)` is the minimal change that
preserves every existing policy's shape while spanning all of a user's groups.
`security definer` + `set search_path = ''` is kept (avoids RLS recursion on
`memberships`, as in 002).

**Alternatives considered**: Returning a `uuid[]` and using `= any(...)` — works
too, but `in (select setof)` reads closer to the original scalar policies and
keeps the diff small. Inlining the subquery into each policy — rejected; the
helper is reused by 5 policies (Principle VII's two-call-site bar is far
exceeded) and centralizes the `security definer` boundary.

## Decision 3: Drop `already_in_nucleus` guards; keep per-group idempotence

**Decision**: In `create_nucleus(p_name)` remove the
`if exists (select 1 from memberships where user_id = v_uid) then raise …`
guard so a user can create any number of groups. In `accept_invitation(p_token)`
remove the same global guard but **keep/repurpose** a check that the user is not
already a member of *that specific* group (the invitation's `nucleus_id`) —
returning an "already a member" outcome without consuming the invitation
(FR-014). `leave_nucleus()` already targets a single membership; generalize its
signature to `leave_group(p_nucleus_id uuid)` so the caller says which group to
leave (a user now has several). Last-member dissolution logic is unchanged but
keyed by the passed group.

**Rationale**: The global guards *were* the single-nucleus rule. Per-group
idempotence (can't double-join the same group; leaving names a group) is what
remains correct with N groups.

**Alternatives considered**: Keep `leave_nucleus()` parameterless and infer the
group — impossible now that a user has many; an explicit id is required.

## Decision 4: Client cache — single `NucleusView` → list `GroupView[]`

**Decision**: Replace the single `NUCLEUS_KEY` meta entry holding one
`NucleusView` with a `GROUPS_KEY` meta entry holding `GroupView[]` (each item:
id, name, members[], pendingInvitations[]). `refreshGroups()` selects *all* rows
(`nuclei`, `memberships`, `invitations` — RLS scopes them to the user) and builds
the array instead of taking `nuclei.data[0]`. Expose:
- `observeGroups(): Observable<GroupView[]>`
- `currentGroupIds(): Promise<string[]>`
- `createGroup(name)`, `createInvitation(nucleusId)`, `acceptInvitation(token)`,
  `leaveGroup(nucleusId)`.

This is a **Dexie meta value shape change only** — no new object store and no
change to the `tasks` store/index (`nucleus_id` index stays). Bump Dexie to
**v5** with an upgrade that drops the stale single-nucleus `NUCLEUS_KEY` entry
(the list is rebuilt on next `refreshGroups()`), so no data is lost.

**Rationale**: At single-household scale the full group list is tiny; caching the
array is simpler than incremental per-group caches (Principle VII). Keeping the
`tasks` store untouched avoids a risky data migration.

**Alternatives considered**: One meta entry per group — more keys to manage with
no benefit at this scale.

## Decision 5: Task scope selection — pick a target group at creation

**Decision**: Replace the binary `TaskScope = 'personal' | 'nucleus'` with an
explicit **target group id** on `NewTaskInput`: `nucleusId: string | null`
(`null` = personal, the default). `taskRepository.createTask` writes that id
directly (no `currentNucleusId()` lookup). The RLS `tasks_insert` check already
guarantees the id is one of the user's groups, so the client trusts the form,
which only offers groups the user belongs to. For anonymous/local-only users the
value is always `null`.

**Rationale**: With many groups, "nucleus" no longer identifies one target; the
task must carry *which* group. Defaulting to `null` (personal) implements the
clarified "always personal by default" decision and keeps anonymous behavior
identical.

**Alternatives considered**: Keep `scope` plus a separate `groupId` — redundant;
the id alone (null = personal) is unambiguous and smaller.

## Decision 6: Unified labeled home view & scope labels

**Decision**: The home keeps showing all tasks `observeTasks()` returns (RLS +
local already merge personal + all groups). `TaskItem` renders a scope badge:
the **owning group's name** (looked up by `nucleusId` in the cached
`GroupView[]`), or "Personal" for `nucleusId === null`. To avoid noise for users
with no groups, **scope labels render only when the user belongs to ≥1 group**;
with zero groups (incl. anonymous) everything is personal and labels are omitted
(matches FR-010's "no group picker"). `memberName(userId)` and the new
`groupName(nucleusId)` look up across the union of all cached groups.

**Rationale**: Implements "todo junto con etiqueta" (clarification) while keeping
the local-only/no-group UI clean. Group-name labels make provenance obvious
without a switcher.

**Alternatives considered**: Always show a "Personal" badge even with no groups —
rejected as visual noise for the common single-user case.

## Decision 7: Sync & Realtime unchanged

**Decision**: Keep `pullAll()` as `select('*')` and the single global
`tasks-sync` Realtime channel. RLS (Decision 2) now returns tasks across all the
user's groups, so no per-group channels or query changes are needed. `mapping.ts`
stays 1:1 on `nucleus_id`.

**Rationale**: The server-side filter generalizes automatically; adding per-group
channels would be complexity with no benefit (Principle VII).

**Alternatives considered**: Per-group Realtime channels — rejected (more
subscriptions to manage; RLS already scopes the global channel).

## Decision 8: Keep internal name `nucleus_id`; user-facing term "grupo"

**Decision**: Keep the column/field/index name `nucleus_id` and the file
`nucleusService.ts` to avoid a large mechanical rename with migration risk.
User-facing Spanish strings and new identifiers use "grupo"/"group"
(`GroupView`, `createGroup`, `groups-multi.spec.ts`, the badge text).

**Rationale**: A schema/identifier rename touches sync mapping, Dexie index, RLS,
and every test for zero functional gain (Principle VII: simplicity, and avoid
churn). The mismatch is documented here so it is intentional, not drift.

**Alternatives considered**: Full rename to `group_id` — deferred; not worth the
migration and diff risk now.

## Migration & rollout notes

- The migration only **drops a constraint, replaces one function, redefines 5
  policies, and edits 3 RPCs**. Existing membership/task rows are untouched, so
  every current single-nucleus user automatically has their nucleus as their one
  group (satisfies FR-005 with no data backfill).
- After applying, regenerate Supabase row types; `nucleus_id` types are unchanged
  so the mapping boundary compiles as-is.
- RLS isolation tests must additionally prove: (a) a user can hold ≥2 memberships;
  (b) a member of group A who is not in group B cannot read B's tasks; (c) leaving
  group A ends access to A while B remains readable.
