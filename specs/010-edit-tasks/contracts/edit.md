# Contract: Edit Tasks (feature 010)

Client-only. No server contract changes (no migration, RLS, RPC or type
regeneration). Surfaces: a pure domain transition, a repository method, and a
generalized form component.

## Pure domain (`domain/edit.ts`)

### `applyEdit(task, parsed, now, newSeriesId): Task`

- Inputs: the existing `Task`, a `ParsedNewTask` (from `parseNewTask`), a
  timestamp `now`, and a `newSeriesId` (used only if recurrence is newly enabled).
- Returns a new Task:
  - `name`, `taskDate`, `description`, `urgent`, `recurrence` ← `parsed`
  - `updatedAt = now`
  - `seriesId = parsed.recurrence != null && task.seriesId == null ? newSeriesId : task.seriesId`
  - preserved: `id`, `ownerId`, `nucleusId`, `completedAt`, `completedBy`, `createdAt`
- Pure; deterministic given `newSeriesId`. Does not read the clock or RNG.

**Guarantees (tested):** identity, owner, scope and completion are never changed;
disabling recurrence yields `recurrence: null`; enabling it on a one-off yields a
non-null `recurrence` and a non-null `seriesId`.

## Repository (`data/taskRepository.ts`)

### `editTask(taskId: string, input: NewTaskInput): Promise<Task>`

- Validates with `parseNewTask` (same rules as creation): non-blank name; valid
  date or null; `dueDate` anchor requires a date → throws `ValidationError`.
- In one rw transaction: load the task (missing → throw); **if completed, no-op**
  (returns it unchanged — UI prevents reaching here); else compute
  `applyEdit(existing, parsed, now, crypto.randomUUID())`, `put` it, enqueue the
  outbox push, `scheduleFlush()`.
- Returns the updated task. `nucleusId` from `input` is ignored (scope immutable).

The existing `TaskRepository` interface gains this one method; `createTask`,
`markDone`, `revert`, `skipOccurrence`, `stopRecurrence` are unchanged.

## Component (`components/TaskForm.tsx`, generalized from `CreateTaskForm`)

```ts
interface TaskFormProps {
  mode?: 'create' | 'edit'            // default 'create'
  initial?: {                          // pre-fill for edit
    name: string
    taskDate: string                   // '' when none
    description: string
    urgent: boolean
    recurrence: Recurrence | null
  }
  submitLabel?: string                 // 'Añadir tarea' | 'Guardar'
  onSubmit: (input: NewTaskInput) => Promise<void>
  onCreated?: () => void               // success callback (close/return)
  onCancel?: () => void
}
```

- Create mode: identical to today, including the scope `<select>` (Personal +
  groups).
- Edit mode: pre-filled; the scope `<select>` is **not rendered** (scope
  immutable); submit label "Guardar".
- Validation errors are shown the same way in both modes.

## UI affordances

- **List** (`TaskItem`): pending tasks show an "Editar" control; activating it
  renders `TaskForm` in edit mode in place of the row; save/cancel restores the
  row. Completed tasks show no "Editar".
- **Deck** (`TaskCard`/`TaskDeck`): the top card shows an "Editar" action
  (with skip/stop); activating it shows `TaskForm` for that task until save/cancel.

## Sync & isolation (unchanged)

- The edit is an ordinary task write: local-first, queued, last-write-wins by
  `updatedAt`. The outbox UPDATE already carries every edited field.
- Group edits reach members via Realtime; personal stays private. RLS and the
  `immutable_ownership` trigger are unaffected because ownership/scope never
  change.
