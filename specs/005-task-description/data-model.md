# Phase 1 Data Model: Task Description

**Feature**: 005-task-description · **Date**: 2026-06-14

One new optional field on the existing **Task**, across all three layers. No new
entity, no relationship change.

## Domain (`apps/web/src/domain/task.ts`)

`Task` gains:

| Field | Type | Notes |
|-------|------|-------|
| `description` | `string \| null` | Free text, may contain line breaks. `null` ⇒ none. |

`NewTaskInput` gains an optional `description?: string | null`. `parseNewTask`:
- trims; empty/whitespace ⇒ `null`;
- otherwise keeps the text verbatim (internal line breaks preserved).

All other fields and the validation of name/date/scope are unchanged.

## Local store (Dexie — `apps/web/src/data/db.ts`)

`db.version(3)`: no new index (description is never queried). `upgrade()` sets
`description = null` on existing `tasks` rows so pre-existing tasks match the
type. `createTask` writes `description` (null when none).

## Postgres (`supabase/migrations/0002_task_description.sql`)

```sql
alter table public.tasks add column description text;
```

- Nullable; no default needed (existing rows ⇒ NULL ⇒ no description).
- Inherits the table's RLS (owner / nucleus); no policy change.
- `database.types.ts` regenerated so `tasks.Row/Insert/Update` include
  `description: string | null`.

## Sync (`apps/web/src/data/sync/mapping.ts`)

`taskToRow` includes `description`; `rowToTask` reads it (`?? null`). The outbox
push, full pull, Realtime application and the LWW `reconcile` are unchanged —
the field is part of the row and follows per-task last-write-wins by
`updatedAt`.

## Display

- **Lists** (`TaskBody` in `TaskItem`): when `description` is non-null, render it
  under the name, wrapping, preserving line breaks (e.g. `white-space: pre-wrap`).
- **Swipe card**: same, visually clamped to a few lines (CSS line-clamp); full
  text remains stored and visible in the list.
- Tasks with `description === null` render exactly as today (nothing extra).
