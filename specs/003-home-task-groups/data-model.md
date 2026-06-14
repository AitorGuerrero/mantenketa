# Phase 1 Data Model: Home Refactor — Grouped Task Lists

**Feature**: 003-home-task-groups · **Date**: 2026-06-13

**No persisted schema change.** No new fields, no Dexie version bump, no
migration, no Postgres change. The groups are *derived* at render time from the
existing `Task` shape and the device's current local day.

## Inputs (existing, unchanged)

From the `Task` type (features 001/002):
- `taskDate: string | null` — `YYYY-MM-DD`; `null` ⇒ "hacer ya".
- `completedAt: string | null` — `YYYY-MM-DD`; non-null ⇒ done.
- `completedBy`, `nucleusId`, `ownerId`, `createdAt`, `updatedAt` — used only for
  existing rendering / tiebreaks, not for grouping membership.

External input: `today` — the device's local calendar day as `YYYY-MM-DD`.

## Derived view model (not stored)

```text
GroupedTasks {
  ya:     Task[]   // completedAt === null && (taskDate === null || taskDate <= today)
  pronto: Task[]   // completedAt === null && taskDate > today
  hechas: Task[]   // completedAt !== null, newest completion first, max 5
}
```

Per-task derived flag (computed in "ya" only):
- `isOverdue = taskDate !== null && taskDate < today` → drives the overdue highlight.

## Membership & ordering rules

| Group | Membership | Order |
|-------|-----------|-------|
| **ya** | outstanding, dateless OR `taskDate <= today` | dateless first, then `taskDate` asc (most overdue → today); `createdAt` tiebreak |
| **pronto** | outstanding, `taskDate > today` | `taskDate` asc; `createdAt` tiebreak |
| **hechas** | completed (`completedAt !== null`) | `completedAt` desc, then `updatedAt` desc, then `createdAt` desc; capped at 5 |

Invariant: every task is in **exactly one** group (completed → hechas;
otherwise ya/pronto split by date vs today). A completed task never appears in
ya/pronto regardless of its date (FR-006).

## State transitions (existing actions, new placement)

- `markDone` → task leaves ya/pronto, enters **hechas** at the top.
- `revert` → task leaves hechas, re-enters **ya** or **pronto** per its date.
- Day rollover (local midnight) → a `taskDate === today` task in **ya** becomes
  overdue-highlighted; a `pronto` task whose date becomes today moves to **ya**.
  Re-evaluated on next render of the live query (no persisted change).
