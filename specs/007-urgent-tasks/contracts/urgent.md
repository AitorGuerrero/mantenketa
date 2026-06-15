# Contract: Urgent Tasks
**Feature**: 007-urgent-tasks

## Create input
```ts
export interface NewTaskInput {
  name: string; taskDate?: string | null; scope?: 'personal' | 'nucleus'
  description?: string | null
  urgent?: boolean // NEW — default false
}
// Task gains `urgent: boolean`.
```

## Backend (migration)
`alter table public.tasks add column urgent boolean not null default false;`
Existing rows ⇒ false; inherits tasks RLS.

## Guarantees (tests)
- parseNewTask (unit, test-first): missing urgent → false; true preserved.
- orderYa (unit, test-first): urgent tasks precede non-urgent; within each, the
  existing order (dateless last, date asc, createdAt) holds.
- e2e: an urgent task in "ya" appears above non-urgent and is clearly marked; a
  future urgent task is marked but stays in "pronto" in date order; non-urgent
  unchanged.
- Sync: urgent round-trips on the task row under existing owner/nucleus RLS.
