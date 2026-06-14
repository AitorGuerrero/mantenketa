# Implementation Plan: Task Description

**Branch**: `005-task-description` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-task-description/spec.md`

## Summary

Add an optional multi-line `description` to a task, set at creation, shown in the
lists and on the swipe card. New field on the existing task record: local in
Dexie (v3 upgrade backfills `null`), a new `description` column in Postgres,
carried through the existing outbox/pull/Realtime sync and the row↔domain
mapping. Blank/whitespace normalizes to no description. No change to grouping,
ordering, overdue, completion, or scope.

See [research.md](./research.md), [data-model.md](./data-model.md), and
[contracts/task-description.md](./contracts/task-description.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict) · **Deps**: React 18, Dexie, Zod,
supabase-js (existing) · **Storage**: IndexedDB (Dexie v3) + Postgres (new
`description` column; row types regenerated) · **Testing**: Vitest (parseNewTask
normalization, test-first) + Playwright (create/show/blank) · **Platform**: PWA
mobile-first · **Constraints**: offline-capable, synced like other fields, no
behavioural change elsewhere.

## Constitution Check (v4.1.0)

| # | Principle | Status | How |
|---|-----------|--------|-----|
| I | Local-First | ✅ | Stored/readable locally, created offline, synced via existing outbox. |
| II | One Language/Types | ✅ | `description` once on Task+Zod; SQL in migrations; row types regenerated, mapped at one boundary. |
| III | Spec Before Code | ✅ | spec (16/16) + plan precede code. |
| IV | Test-First Domain | ✅ | `parseNewTask` normalization (blank→null, trim, keep line breaks) failing-first; UI/sync via e2e + RLS suite. |
| V | Cheap | ✅ | One nullable column. |
| VI | Single Env | ✅ | Migration to the one Supabase project via db push. |
| VII | Simplicity | ✅ | A textarea + a row field; no new abstraction. |
| VIII | Tenant-Ready | ✅ | Column on tasks under existing owner/nucleus RLS; no isolation change. |
| IX | Mobile-First | ✅ | Field + display designed for phone; card clamps, list shows full. |

All gates pass → Complexity Tracking empty.

## Project Structure

```text
apps/web/src/
  domain/task.ts        # + description on TaskSchema/Task + NewTaskInput; parseNewTask normalizes
  domain/task.test.ts   # + description normalization (test-first)
  data/db.ts            # Dexie v3 upgrade: backfill description = null
  data/sync/mapping.ts  # taskToRow/rowToTask carry description
  data/database.types.ts# regenerated after migration (generated)
  data/taskRepository.ts# createTask stores parsed description
  components/CreateTaskForm.tsx  # optional multi-line "Descripción" textarea
  components/TaskItem.tsx        # TaskBody shows description (lists + card) when present
supabase/migrations/0002_task_description.sql  # ALTER TABLE tasks ADD COLUMN description text
apps/web/tests/e2e/task-description.spec.ts     # create→shown in list+card; blank = none
```

**Structure Decision**: One additive field threaded through existing layers; no
new components beyond the textarea and the migration.

## Complexity Tracking

> No constitution violations — no entries required.
