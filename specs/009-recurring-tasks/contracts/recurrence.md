# Contract: Recurring Tasks (feature 009)

Surfaces: the pure recurrence domain functions, the client task-repository
operations, and the additive persistence/sync. Only deltas from prior features
are normative.

## Pure domain (`domain/recurrence.ts`)

### `nextOccurrenceDate(base: string, rec: Recurrence): string`

- `base`, return value: `YYYY-MM-DD`.
- daily → base + `interval` days; weekly → base + `7·interval` days;
  monthly → +`interval` calendar months; yearly → +`interval` calendar years.
- **Clamp**: if the target day doesn't exist in the target month, return the last
  day of that month (Jan 31 +1m → Feb 28/29; Feb 29 +1y → Feb 28).
- Pure; UTC-based; no timezone drift. (Tested first — Principle IV.)

### `cadenceLabel(rec: Recurrence): string`

- `interval === 1` → "cada día" / "cada semana" / "cada mes" / "cada año".
- `interval > 1` → "cada N días/semanas/meses/años".

### `successorId(seriesId: string, nextDate: string): string`

- Returns `uuidv5(`${seriesId}:${nextDate}`, NAMESPACE)` — a valid UUID.
- **Deterministic**: same inputs ⇒ same id on every device (dedup guarantee).

## Client task repository (`data/taskRepository.ts`)

```ts
createTask(input: NewTaskInput): Promise<Task>     // input.recurrence?: Recurrence|null
markDone(taskId: string): Promise<Task>            // spawns successor if recurring
revert(taskId: string): Promise<Task>              // removes pending successor if recurring
skipOccurrence(taskId: string): Promise<Task>      // NEW
stopRecurrence(taskId: string): Promise<Task>      // NEW
```

**createTask contract**:
- If `recurrence` is set, assign a fresh `seriesId` (the root stores its own).
  `anchor === 'dueDate'` requires `taskDate` (else ValidationError before write).
- Non-recurring: `recurrence = null`, `seriesId = null` (unchanged behavior).

**markDone contract**:
- No-op if already done (idempotent), and spawns no successor in that case.
- If the task is recurring and newly completed: in one rw transaction, stamp
  `completedAt = today` AND insert the successor with `successorId(seriesId,
  next)`, `taskDate = next`, `completedAt = null`, carrying name, description,
  urgent, `nucleus_id`, `recurrence`, `seriesId`. Both rows enqueued to the
  outbox. Next base: completion-anchored → today; dueDate-anchored → current
  `task_date`.
- The successor insert is idempotent on its deterministic id (re-running does not
  create a second row).

**revert contract**:
- Clears `completedAt`; if recurring, deletes the successor row
  (`successorId(seriesId, next)`) iff it exists and is still pending
  (`completedAt === null`). Otherwise leaves it.

**skipOccurrence contract**:
- Requires the task to be recurring and pending. Sets `task_date` to
  `nextOccurrenceDate(baseForSkip)` (completion-anchored → today; dueDate-anchored
  → current `task_date`), keeps it pending, stamps `updatedAt`. No completion
  recorded; same id; series continues.

**stopRecurrence contract**:
- Sets `recurrence = null` on the task, keeps date/content, stamps `updatedAt`.
  Subsequent completion creates no successor. Past completed instances unaffected.

## Persistence & sync

- `tasks` gains `recurrence jsonb` (nullable) and `series_id uuid` (nullable).
- `sync/mapping.ts`: `taskToRow` writes `recurrence`, `series_id`; `rowToTask`
  reads them back into `recurrence`, `seriesId`.
- `sync/syncEngine.ts`: the UPDATE payload includes `recurrence` and `series_id`.
- Dexie **v6**: backfill `recurrence = null`, `seriesId = null`.
- RLS, Realtime and the pull query are unchanged; the successor is a normal task
  row covered by the existing per-group policies. Conflict resolution: LWW;
  deterministic successor id converges concurrent completions to one row.

## UI

- `CreateTaskForm`: a "Repetir" toggle revealing frequency (select), interval
  (number ≥ 1) and anchor (select: "Desde que la complete" / "En la fecha
  prevista"); default off, default anchor completion.
- `TaskBody`: cadence badge from `cadenceLabel`, beside urgent/group badges.
- Recurring tasks expose "Saltar" and "No repetir más" actions (list + deck).
