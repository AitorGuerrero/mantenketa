---
description: "Task list for feature 005 — optional task description"
---

# Tasks: Task Description

**Input**: Design documents from `/specs/005-task-description/`

**Tests**: Principle IV — failing-first unit test for `parseNewTask` description
normalization. UI/sync via Playwright e2e and the existing RLS suite.

## Phase 1: Backend & schema

- [X] T001 Migration `supabase/migrations/20260614120000_task_description.sql`: `alter table public.tasks add column description text;` — apply with `supabase db push`
- [X] T002 Regenerate `apps/web/src/data/database.types.ts` (`supabase gen types typescript --linked`) and verify it compiles (tasks Row/Insert/Update include `description`)
- [X] T003 Dexie v3 in `apps/web/src/data/db.ts`: `db.version(3)` with `upgrade()` backfilling `description = null` on existing tasks (no new index)

## Phase 2: Domain (test-first)

- [X] T004 [P] Failing unit tests in `apps/web/src/domain/task.test.ts`: `parseNewTask` trims description, '' / whitespace → null, internal line breaks preserved, name-only input → `description: null`
- [X] T005 Extend `Task`/`TaskSchema` with `description: string | null` and `NewTaskInputSchema` with optional normalized `description` in `apps/web/src/domain/task.ts` (makes T004 pass); `createTask` writes the parsed description in `apps/web/src/data/taskRepository.ts`

## Phase 3: Sync & UI

- [X] T006 Carry `description` in `apps/web/src/data/sync/mapping.ts` (`taskToRow` + `rowToTask`)
- [X] T007 [P] Add an optional multi-line "Descripción" textarea to `apps/web/src/components/CreateTaskForm.tsx` (cleared on save/cancel like the other fields)
- [X] T008 [P] Render the description (when present) under the task in `TaskBody` (`apps/web/src/components/TaskItem.tsx`) — `white-space: pre-wrap`; CSS line-clamp on the swipe card in `apps/web/src/index.css`

## Phase 4: e2e & validation

- [X] T009 Playwright e2e `apps/web/tests/e2e/task-description.spec.ts`: create with a multi-line description → shown in the list (and on the card in a touch context); create with empty description → no description shown
- [X] T010 Full validation: `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`, `pnpm test:rls` green; features 001–004 regression-free; SPDX headers on any new files

## Dependencies

- T001→T002→T003; T004 (fail) → T005; T005→T006; UI (T007/T008) after T005;
  e2e (T009) after UI. T010 last.

## Notes

- Additive field; no change to grouping/deck/overdue/completion/scope.
- Total: 10 tasks.
