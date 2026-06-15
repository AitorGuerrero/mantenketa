---
description: "Task list for feature 007 — urgent tasks"
---
# Tasks: Urgent Tasks

**Tests**: Principle IV — failing-first unit tests for orderYa (urgent-first) and
parseNewTask (urgent default). UI/sync via e2e + RLS suite.

## Phase 1: Backend & schema
- [X] T001 Migration `supabase/migrations/20260615120000_task_urgent.sql`: `alter table public.tasks add column urgent boolean not null default false;` — apply with `supabase db push`
- [X] T002 Regenerate `apps/web/src/data/database.types.ts`; verify compiles (tasks include `urgent`)
- [X] T003 Dexie v4 in `apps/web/src/data/db.ts`: `db.version(4)` upgrade backfilling `urgent = false`

## Phase 2: Domain (test-first)
- [X] T004 [P] Failing unit tests: `parseNewTask` urgent default false / preserved true (`apps/web/src/domain/task.test.ts`); `orderYa` urgent-first within ya keeping sub-order (`apps/web/src/domain/grouping.test.ts`)
- [X] T005 `Task`/Zod + `NewTaskInput` gain `urgent` in `apps/web/src/domain/task.ts`; `orderYa` sorts urgent first in `apps/web/src/domain/grouping.ts`; update test makeTask helpers (`urgent: false`); `createTask` stores urgent (`apps/web/src/data/taskRepository.ts`) — makes T004 pass

## Phase 3: Sync & UI
- [X] T006 Carry `urgent` in `apps/web/src/data/sync/mapping.ts` + the outbox UPDATE in `syncEngine.ts`
- [X] T007 [P] "Urgente" checkbox in `apps/web/src/components/CreateTaskForm.tsx`
- [X] T008 [P] Urgent marker: badge in `TaskBody` + `task-item--urgent`; `task-card--urgent` + back-face badge in `TaskCard`; `task-card-peek--urgent` in `TaskDeck`; styles in `apps/web/src/index.css`

## Phase 4: e2e & validation
- [X] T009 Playwright `apps/web/tests/e2e/urgent-tasks.spec.ts`: urgent in ya sorts above non-urgent + marked; future urgent stays in pronto; non-urgent unchanged
- [X] T010 Full validation: test, lint, build, e2e, test:rls green; 001–006 regression-free

## Notes
- Additive boolean + one sort key + marker. Total: 10 tasks.
