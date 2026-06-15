# Quickstart: Recurring Tasks (feature 009)

How to build, migrate and validate this feature locally.

## Prerequisites

- pnpm (never npm). Commands from `apps/web` unless noted.
- A linked Supabase project for `db push` / RLS tests.

## 1. Add the dependency

```bash
pnpm --filter @mantenketa/web add uuid
pnpm --filter @mantenketa/web add -D @types/uuid
```

Used only for deterministic successor ids (`uuid` v5) in `domain/recurrence.ts`.

## 2. Apply the migration

```bash
# from repo root
supabase db push   # applies supabase/migrations/20260615140000_recurring_tasks.sql
```

Adds nullable `recurrence jsonb` and `series_id uuid` to `public.tasks`. No row
migration; no RLS change.

## 3. Regenerate row types

```bash
supabase gen types typescript --linked > apps/web/src/data/database.types.ts
```

## 4. Run the test pyramid (all green before merge)

```bash
pnpm test        # unit incl. recurrence.test.ts (calc + clamp + deterministic id), test-first
pnpm test:rls    # existing isolation still holds (recurrence adds no visibility surface)
pnpm lint
pnpm build
pnpm test:e2e    # incl. recurring-tasks.spec.ts
```

## 5. Manual smoke (mobile viewport first — Principle IX)

1. New task "Regar plantas", toggle **Repetir** → cada 1 semana, anchor "Desde
   que la complete", no date. Save. It shows a "cada semana" badge.
2. Mark it done → it moves to "Hechas recientemente"; a new pending "Regar
   plantas" appears dated 7 days from today, still "cada semana".
3. New task "Pagar alquiler", monthly, anchor "En la fecha prevista", dated the
   1st. Complete it on a later day → next instance dated the 1st of next month.
4. On a recurring task, **Saltar** → date jumps one interval, no completion
   recorded. **No repetir más** → badge disappears; completing it spawns nothing.
5. Two browsers signed into the same group: a recurring group task completed in
   one appears (successor) in the other within ~5 s, with no duplicate.

## 6. Acceptance mapping

| Spec | Verified by |
|------|-------------|
| US1 (complete → successor; dateless ok) | recurrence.test.ts; recurring-tasks.spec.ts |
| US2 (due-date anchor; month clamp) | recurrence.test.ts (clamp); recurring-tasks.spec.ts |
| US3 (skip / stop) | recurring-tasks.spec.ts |
| FR-007 / SC-003 (deterministic dedup) | recurrence.test.ts (successorId) |
| FR-012 (RLS/scope/urgent/order intact) | existing unit + rls + e2e suites |

## Rollback

Revert the migration by dropping the two columns (additive, no data depends on
them yet beyond this feature). Remove the `uuid` dependency and
`domain/recurrence.ts` along with the repository/UI wiring.
