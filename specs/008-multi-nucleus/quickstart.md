# Quickstart: Multiple Groups per User (feature 008)

How to build, migrate and validate this feature locally.

## Prerequisites

- pnpm (never npm). Run commands from `apps/web` unless noted.
- A linked Supabase project for `db push` / RLS tests (same single project,
  Principle VI).

## 1. Apply the migration

```bash
# from repo root
supabase db push        # applies supabase/migrations/20260615130000_multi_group.sql
```

The migration: drops `unique (user_id)` on `memberships`; replaces
`my_nucleus_id()` with set-returning `my_nucleus_ids()`; rewrites the 5 group
policies to use `in (select public.my_nucleus_ids())`; renames/edits the RPCs
(`create_group`, `accept_invitation`, `leave_group`) to drop the single-nucleus
guards. No row data is migrated (existing nucleus becomes the user's one group).

## 2. Regenerate row types

```bash
pnpm gen:types          # supabase gen types typescript → src/data/database.types.ts
```

`nucleus_id` types are unchanged, so the mapping boundary still compiles.

## 3. Run the test pyramid (must all be green before merge)

```bash
pnpm test               # unit (incl. new scope-selection tests, test-first)
pnpm test:rls           # RLS isolation: ≥2 memberships allowed; cross-group denial; leave ends access
pnpm lint
pnpm build
pnpm test:e2e           # incl. groups-multi.spec.ts + generalized nucleus specs
```

## 4. Manual smoke (mobile viewport first — Principle IX)

1. Sign in. Open the groups panel; **create two groups** ("Casa", "Viaje"). Both
   appear in the list; you remain a member of both.
2. Create a task, leave scope default → appears as **Personal** (no group badge
   if you had zero groups; with groups, labeled "Personal").
3. Create a task, pick "Casa" → appears labeled **Casa**; create one in "Viaje"
   → labeled **Viaje**. All three show together in the home, merged and ordered
   by the usual rules.
4. With a second account, accept an invitation to "Casa" only → that account sees
   Casa's tasks but not Viaje's.
5. Leave "Viaje" → its tasks disappear for you; "Casa" and personal tasks remain.

## 5. Acceptance mapping

| Spec | Verified by |
|------|-------------|
| US1 (belong to many groups) | groups-multi.spec.ts; rls-nucleus.test.ts (2 memberships) |
| US2 (unified labeled view; default personal) | groups-multi.spec.ts (labels); task.test.ts (default null) |
| US3 (per-group invite/accept/leave) | nucleus-invite.spec.ts (generalized); rls-nucleus.test.ts (leave one keeps other) |
| FR-005 (migration, no data loss) | existing rows untouched; manual smoke step 1 on a pre-existing account |
| Isolation (Principle VIII) | rls-nucleus.test.ts cross-group denial |

## Rollback

Revert the migration by restoring the scalar `my_nucleus_id()`, the
`unique (user_id)` constraint (only possible if no user yet has >1 membership),
and the original RPC guards. Because the change is additive at the data level
(no rows altered), rollback is safe only before any user joins a second group.
