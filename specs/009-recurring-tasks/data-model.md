# Phase 1 Data Model: Recurring Tasks

Only the deltas from the current model (features 001/002/007/008) are described.

## Entities

### Recurrence (value carried by a task; `null` ⇒ one-off)

| Field | Type | Notes |
|-------|------|-------|
| freq | 'daily' \| 'weekly' \| 'monthly' \| 'yearly' | the unit |
| interval | integer ≥ 1 | "every N" |
| anchor | 'completion' \| 'dueDate' | base for the next date; `dueDate` requires the task to have a date |

Validation:
- `interval` is an integer ≥ 1.
- `anchor === 'dueDate'` ⇒ the task MUST have a `taskDate` (enforced at creation).
- `anchor === 'completion'` works with or without a date.

### Task (table `public.tasks` — additive columns)

| Field | Type | Notes |
|-------|------|-------|
| id | uuid PK | client id; for a successor it is **deterministic** (see below) |
| owner_id | uuid | unchanged |
| nucleus_id | uuid? | unchanged (null = personal, else one group) |
| name / task_date / completed_at / completed_by | — | unchanged |
| description | text? | unchanged (feat 005) |
| urgent | boolean | unchanged (feat 007) |
| **recurrence** | **jsonb?** | **NEW** — the Recurrence value, or null for one-off |
| **series_id** | **uuid?** | **NEW** — shared by all instances of one recurring series; null for one-off |
| created_at / updated_at | timestamptz | LWW clock |

- No index added (recurrence/series_id are not query keys; the successor is
  looked up by its deterministic id).
- `series_id` is set when a task is first created as recurring (the root stores
  its own series id) and copied to every successor.

## Domain types (client, `apps/web/src/domain/task.ts`)

- **DELTA `TaskSchema`**: add
  - `recurrence: RecurrenceSchema.nullable()`
  - `seriesId: z.string().nullable()`
- **NEW `RecurrenceSchema`** (Zod):
  ```ts
  RecurrenceSchema = z.object({
    freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
    interval: z.number().int().min(1),
    anchor: z.enum(['completion', 'dueDate']),
  })
  ```
- **DELTA `NewTaskInput`**: add optional `recurrence?: Recurrence | null`
  (default null). `parseNewTask` validates and, when `anchor === 'dueDate'`,
  requires a `taskDate` (else ValidationError).

## Pure functions (`apps/web/src/domain/recurrence.ts`, test-first)

```ts
type Unit = 'day' | 'week' | 'month' | 'year'

// next date from a base YYYY-MM-DD; month/year clamp to last valid day
nextOccurrenceDate(base: string, rec: Recurrence): string

// "cada día" | "cada 2 semanas" | "cada 3 meses" | "cada año" …
cadenceLabel(rec: Recurrence): string

// deterministic successor id: uuidv5(`${seriesId}:${nextDate}`, NAMESPACE)
successorId(seriesId: string, nextDate: string): string
```

## State transitions (where they live)

- **markDone(recurring)** → current row `completedAt = today`; INSERT successor
  with `successorId(seriesId, next)`, `taskDate = next`, same name/description/
  urgent/nucleus_id/recurrence/series_id, `completedAt = null`. One Dexie
  transaction + outbox. Next base: `anchor==='completion'` → today;
  `anchor==='dueDate'` → current `task_date`.
- **revert(recurring)** → current row `completedAt = null`; delete the successor
  (`successorId(seriesId, next)`) iff present and still pending.
- **skipOccurrence** → current row `task_date = nextOccurrenceDate(baseForSkip)`,
  stays pending, `updatedAt` stamped. Base: completion-anchored → today;
  dueDate-anchored → current `task_date`.
- **stopRecurrence** → current row `recurrence = null`, `updatedAt` stamped.

Completion stays idempotent; markDone on an already-done task is a no-op and
does not spawn a second successor.

## Relationships

```text
series_id 1 ──< task (instances, one open at a time)
profile  1 ──< task (owner_id)
nucleus 0..1 ──< task (nucleus_id; null = personal)
```

## Migration (`supabase/migrations/20260615140000_recurring_tasks.sql`)

```sql
alter table public.tasks add column recurrence jsonb;
alter table public.tasks add column series_id uuid;
```

No RLS change (successor INSERT/SELECT already covered). `tasks_guard` unchanged:
it forbids `owner_id`/`nucleus_id` changes and enforces LWW; `task_date` and
`recurrence` updates (skip/stop) are permitted; the successor is an INSERT.
