# Implementation Plan: Urgent Tasks

**Branch**: `007-urgent-tasks` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

## Summary
Add a boolean `urgent` to a task (set at creation). Urgent tasks in "Para hacer
ya" sort above non-urgent (existing within-group order preserved); "pronto"/
"hechas" not reordered. A clear urgent marker shows on the card (front, back,
peek) and list rows. New nullable→default-false column synced via the existing
path; Dexie v4. Ordering change is test-first domain logic.

See research.md, data-model.md, contracts/urgent.md.

## Technical Context
TS 5.x strict · React 18, Dexie, Zod, supabase-js (existing) · IndexedDB (Dexie
v4) + Postgres (new `urgent boolean`) · Vitest (orderYa urgent-first + parseNewTask,
test-first) + Playwright (urgent marked + sorts first; non-urgent unchanged) +
RLS suite · PWA mobile-first · no behavioural change beyond ya-ordering + marker.

## Constitution Check (v4.1.0)
| # | Principle | Status | How |
|---|-----------|--------|-----|
| I | Local-First | ✅ | Stored/readable locally, created offline, synced via outbox. |
| II | One Language/Types | ✅ | `urgent` once on Task+Zod; SQL in migrations; types regenerated, mapped at one boundary. |
| III | Spec Before Code | ✅ | spec (16/16) + plan precede code. |
| IV | Test-First Domain | ✅ | orderYa urgent-first + parseNewTask urgent default — failing-first unit tests. UI/sync via e2e + RLS. |
| V | Cheap | ✅ | One boolean column. |
| VI | Single Env | ✅ | Migration to the one Supabase project. |
| VII | Simplicity | ✅ | A toggle + a field + a sort key + a marker; no new abstraction. |
| VIII | Tenant-Ready | ✅ | Column on tasks under existing owner/nucleus RLS. |
| IX | Mobile-First | ✅ | Marker designed for the card first; ya-ordering surfaces urgent on the phone. |

All gates pass → Complexity Tracking empty.

## Project Structure
```text
apps/web/src/
  domain/task.ts        # + urgent on Task/Zod + NewTaskInput; parseNewTask default false
  domain/task.test.ts   # + urgent default/true (test-first)
  domain/grouping.ts    # orderYa: urgent first, then existing rules
  domain/grouping.test.ts # + urgent-first ordering (test-first)
  data/db.ts            # Dexie v4 upgrade: backfill urgent = false
  data/sync/mapping.ts  # taskToRow/rowToTask carry urgent
  data/sync/syncEngine.ts # update payload carries urgent
  data/database.types.ts# regenerated (generated)
  data/taskRepository.ts# createTask stores parsed urgent
  components/CreateTaskForm.tsx # "Urgente" checkbox
  components/TaskItem.tsx       # urgent badge in TaskBody; task-item--urgent
  components/TaskCard.tsx       # task-card--urgent; urgent badge on the back
  components/TaskDeck.tsx       # task-card-peek--urgent
  index.css             # urgent badge + tint
supabase/migrations/20260615120000_task_urgent.sql  # add urgent boolean not null default false
apps/web/tests/e2e/urgent-tasks.spec.ts
```
**Structure Decision**: additive boolean threaded through existing layers + one
sort key + a marker; no new components/modules.

## Complexity Tracking
> No violations.
