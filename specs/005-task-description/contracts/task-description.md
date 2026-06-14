# Contract: Task Description

**Feature**: 005-task-description

Extends the existing contracts (no new surface); the deltas:

## Domain create input

```ts
export interface NewTaskInput {
  name: string
  taskDate?: string | null
  scope?: 'personal' | 'nucleus'
  description?: string | null // NEW — optional free text (multi-line)
}
// parseNewTask: trims description; '' / whitespace → null; otherwise verbatim
// (internal line breaks preserved). Task gains `description: string | null`.
```

## Backend (migration)

`supabase/migrations/0002_task_description.sql`:

```sql
alter table public.tasks add column description text;
```

- Nullable; existing rows become NULL (no description).
- No RLS change: covered by the existing `tasks` owner/nucleus policies.

## Guarantees (verified by tests)

- **parseNewTask** (unit, test-first): blank/whitespace description → `null`;
  surrounding whitespace trimmed; internal newlines preserved; a name-only input
  still yields `description: null`.
- **Create + display** (e2e): a task created with a multi-line description shows
  it in the list and on the card; line breaks preserved; a task created with an
  empty description shows no description and is identical to current tasks.
- **Sync** (existing RLS/integration path): the description round-trips on the
  task row under the same owner/nucleus isolation; no new policy.
- **No behavioural change**: grouping, ordering, overdue, completion, scope are
  unaffected by the presence/absence of a description.
