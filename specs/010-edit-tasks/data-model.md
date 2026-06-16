# Phase 1 Data Model: Edit Tasks

No schema change. Editing mutates existing fields of an existing `Task`.

## Entity: Task (unchanged shape)

From features 001/002/007/008/009. Editing touches only the **mutable content**
fields; the rest are preserved.

| Field | On edit |
|-------|---------|
| id | preserved (same identity) |
| ownerId | preserved |
| nucleusId | preserved (scope immutable) |
| name | **editable** (non-blank) |
| taskDate | **editable** (valid `YYYY-MM-DD` or null → "hacer ya") |
| description | **editable** (trimmed; empty → null) |
| urgent | **editable** |
| recurrence | **editable** (enable/disable; freq/interval/anchor) |
| seriesId | set to a new id when recurrence is newly enabled; otherwise preserved |
| completedAt / completedBy | preserved (editing does not change completion) |
| createdAt | preserved |
| updatedAt | stamped to "now" (LWW clock) |

Constraint: only **pending** tasks (`completedAt === null`) are edited.

## Edit input (client)

Reuses the creation shapes (no new type for the wire):

- `NewTaskInput` fields used by edit: `name`, `taskDate`, `description`,
  `urgent`, `recurrence`. `nucleusId` is omitted/ignored (scope immutable).
- `parseNewTask(input)` validates exactly as in creation:
  - non-blank `name`,
  - valid date or null,
  - `recurrence.anchor === 'dueDate'` requires a `taskDate`.

## Pure transition (`apps/web/src/domain/edit.ts`)

```ts
applyEdit(task: Task, parsed: ParsedNewTask, now: string, newSeriesId: string): Task
```

Returns a new Task:
- from `parsed`: `name`, `taskDate`, `description`, `urgent`, `recurrence`
- `updatedAt = now`
- `seriesId`: `parsed.recurrence != null && task.seriesId == null ? newSeriesId : task.seriesId`
- preserved verbatim: `id`, `ownerId`, `nucleusId`, `completedAt`, `completedBy`, `createdAt`

Pure and deterministic (the random series id is supplied by the caller).

## Repository operation (`taskRepository.editTask`)

```ts
editTask(taskId: string, input: NewTaskInput): Promise<Task>
```

1. `parsed = parseNewTask(input)` (throws `ValidationError` on invalid input).
2. In one rw transaction: read the task; if missing → error; if already
   completed → no-op (return as-is, defensive — UI gates this).
3. `stamped = applyEdit(existing, parsed, now, crypto.randomUUID())`.
4. `db.tasks.put(stamped)`, enqueue outbox, `scheduleFlush()`.

No change to `mapping.ts` / `syncEngine` (the UPDATE payload already includes
name, task_date, description, urgent, recurrence, series_id).

## State & validation rules

- Editing never changes scope or owner → RLS/`immutable_ownership` trigger
  unaffected.
- Re-ordering after an edit is handled by the existing reactive read path
  (`observeTasks` → `groupTasks`/ordering).
- Conflict resolution unchanged: last-write-wins by `updatedAt`.
