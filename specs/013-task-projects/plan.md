# Implementation Plan: Group tasks by project

**Branch**: `013-task-projects` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

## Summary

Add **projects** as a way to gather related tasks (e.g. "Arreglar la cocina").
Two proven patterns are reused so the tasks sync engine is untouched:

- The **`projects` entity** follows the **groups (`nuclei`)** pattern: a Postgres
  table with RLS by owner/nucleus membership, and a `projectService` that caches
  in Dexie (`meta`) and mutates via direct Supabase calls + `refresh`. Like
  groups, creating/renaming/deleting a project needs connection.
- The **task→project link** is a `projectId` field on the task, following the
  **`assigneeId`** pattern (optional, local-first, travels with the task). So
  assigning a task to an existing project works offline and syncs with tasks.

Projects are personal or group-scoped; the form's "Proyecto" selector offers only
projects of the active scope (like "Asignar a"). Tasks show a "📁" badge and can
be filtered by project; the ya/pronto/hechas sections stay.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8
**Primary Dependencies**: Dexie (IndexedDB), @supabase/supabase-js (sync/RLS/Realtime), Zod v4
**Storage**: IndexedDB (Dexie) source of truth; Supabase Postgres for sync
**Testing**: Vitest (domain: project normalize/filter, applyEdit), Playwright (e2e, Supabase-gated)
**Project Type**: Web app (single `apps/web` package); mobile-first
**Constraints**: Offline assign to existing project; project CRUD needs connection (like groups); no task ownership/scope mutation

## Constitution Check

- **I. Local-First** — PASS. `projectId` is a local task field synced with tasks; assigning offline works. Project CRUD needs connection, consistent with groups (Principle I requires offline for *task* flows, which assignment honours).
- **II. One Language, One Type System** — PASS. `projectId` defined once in `TaskSchema`; the SQL maps through `mapping.ts`. `ProjectView` mirrors `GroupView`.
- **III. Spec Before Code** — PASS. spec.md + this plan merge before code.
- **IV. Test-First for Domain Logic** — PASS. `domain/project.ts` (`normalizeProject`, `filterByProject`) and `applyEdit` project reassignment are pure and unit-tested first.
- **V. Cheap by Default** — PASS. One table + one nullable column; no new service/dependency.
- **VI. Single Deployable Environment** — PASS. One additive migration; `supabase db push`.
- **VII. Simplicity Over Framework Magic** — PASS. Reuses the `nuclei` service pattern and the `assigneeId` field pattern; no sync-engine generalization, no join table.
- **VIII. Tenant-Ready Data Model** — PASS. `projects` RLS mirrors `tasks` (owner/nucleus); `project_id` is additive and nullable and never changes task owner/nucleus, so `tasks_guard` and isolation tests still hold.
- **IX. Mobile-First UI** — PASS. Selector, badge and filter verified at a narrow viewport.

**Result**: PASS — no violations.

## Project Structure

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── task.ts            # +projectId in TaskSchema/NewTaskInput; parse normalizes
│   │   ├── project.ts         # NEW pure: normalizeProject / filterByProject
│   │   ├── project.test.ts    # NEW test-first
│   │   ├── edit.ts            # applyEdit reassigns project (normalized to scope)
│   │   └── *.test.ts          # makeTask fixtures gain projectId: null
│   ├── data/
│   │   ├── projectService.ts  # NEW (nucleusService pattern): observe/refresh/create/rename/delete
│   │   ├── nucleusService.ts   # refresh projects on join/leave
│   │   ├── taskRepository.ts  # createTask sets project (scope-normalized); successor inherits
│   │   ├── db.ts              # Dexie v8: backfill projectId = null
│   │   ├── sync/mapping.ts    # project_id ⇄ projectId
│   │   ├── sync/syncEngine.ts # add project_id to the UPDATE column list (cf. 012 bug)
│   │   └── database.types.ts  # +projects table; +project_id on tasks
│   ├── components/
│   │   ├── TaskForm.tsx       # "Proyecto" selector for the active scope (create + edit)
│   │   ├── taskFormInitial.ts # initial carries projectId
│   │   ├── TaskItem.tsx       # projectName resolver; "📁" badge
│   │   ├── TaskGroups.tsx     # project filter; thread projectName resolver
│   │   ├── TaskCard.tsx/TaskDeck.tsx # pass projectName resolver to the card
│   │   └── ProjectsPanel.tsx  # NEW (GroupsPanel pattern): create/rename/delete
│   ├── App.tsx                # mount ProjectsPanel
│   ├── main.tsx              # startProjectsCache()
│   └── index.css             # project badge + filter styles (mobile-first)
├── supabase/migrations/
│   └── 20260625130000_projects.sql  # NEW: projects table + RLS; tasks.project_id
└── tests/e2e/
    ├── ui.ts                 # createTask gains `project` option
    └── projects.spec.ts      # NEW (Supabase-gated): assign on create, filter, group project shared, reassign
```

**Structure Decision**: Single-package web app. Project entity = `nuclei` pattern
(table + RLS + cached service); task link = `assigneeId` pattern (field on task).
No sync-engine change beyond adding `project_id` to the task UPDATE list.

## Complexity Tracking

No constitution violations — section intentionally empty.

## Notes / v1 limits

- Project CRUD needs connection; assigning to existing projects works offline.
- No realtime for the project entity: a project created by another member shows
  after a refresh/reload (like groups).
- Scope↔project integrity is UI-enforced (no trigger) — enough for v1.
- No project state (archive/progress/date) in v1 — future.
