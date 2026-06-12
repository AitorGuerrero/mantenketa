# Phase 1 Data Model: Task Create & Complete

**Feature**: 001-task-create-complete · **Date**: 2026-06-07 · Local-only (Dexie/IndexedDB)

## Entity: Task

A single thing to be done on a given day. Stored only in the browser's IndexedDB.

### Fields

| Field | Type (TS) | Required | Notes |
|-------|-----------|----------|-------|
| `id` | `string` (UUID) | yes | Client-generated (`crypto.randomUUID()`). Stable primary key. |
| `name` | `string` | yes | Free text; non-empty after trim (FR-002). |
| `taskDate` | `string \| null` (`YYYY-MM-DD`) | no | The day the task is scheduled. Calendar day, no time-of-day. `null` ⇒ "to do right away" (FR-003): no date is stored and the task sorts before date-bearing ones. |
| `completedAt` | `string \| null` (`YYYY-MM-DD`) | no | The day it was marked done (FR-007). `null` ⇒ outstanding; non-null ⇒ done. Cleared on revert (FR-010). |
| `createdAt` | `string` (ISO) | yes | Set at creation; stable tiebreak for ordering. |

**Derived (not stored)**: `isDone = completedAt !== null`. Completion state is
represented solely by `completedAt`, so the date and the state can never disagree.

> No `ownerId` and no `updatedAt` in this phase — Principle VIII is dormant
> (local-only, single person) and there is no sync requiring a write clock. Both
> are introduced with the future backend/sync phase.

### Validation rules (from requirements)

- `name` MUST be non-empty after trimming (FR-002) — enforced by the shared Zod
  schema before any write.
- `taskDate` is OPTIONAL (FR-003): absent/empty input normalizes to `null`
  ("to do right away"); when present it MUST be a valid `YYYY-MM-DD` day.
- Marking done is **idempotent** (FR-008): if `completedAt` is already set,
  re-marking does not change it.
- Reverting (FR-010) sets `completedAt = null`.

### State transitions

```
            create (completedAt = null)
                     │
                     ▼
              ┌─────────────┐   mark done (completedAt = today)   ┌──────────┐
              │ OUTSTANDING │ ───────────────────────────────────▶ │   DONE   │
              │completedAt  │ ◀─────────────────────────────────── │completed │
              │   = null    │      revert (completedAt = null)      │At set    │
              └─────────────┘                                       └──────────┘
```

`mark done` on an already-DONE task is a no-op (idempotent). `revert` on an
already-OUTSTANDING task is a no-op. These transitions are the test-first domain
logic per Principle IV.

### Ordering (FR-005)

Outstanding first (`completedAt === null`); within each group, dateless tasks
(`taskDate === null`, "to do right away") come first, then by `taskDate`
ascending (soonest at top); completed below with the same internal order;
`createdAt` is the final tiebreak. Implemented as a pure sort function
(unit-tested).

## Client schema (Dexie / IndexedDB)

```text
db.version(1).stores({
  tasks: 'id, taskDate, completedAt, createdAt'
})
```

- Single `tasks` object store keyed by `id`; indexes on `taskDate`,
  `completedAt`, and `createdAt` support the ordered list query.
- No `outbox` and no `meta` store — there is no sync in this phase.

## Domain types (`apps/web/src/domain`)

- `Task` type + `TaskSchema` (Zod) — the canonical domain shape, defined once
  (Principle II).
- `NewTaskInput` (`name` + `taskDate`) for creation.
