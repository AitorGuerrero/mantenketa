# Implementation Plan: Assign a group task to a member

**Branch**: `012-assign-task-member` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

## Summary

Add an optional **assignee** to group tasks. The domain `Task` gains a nullable
`assigneeId`; the create/edit form (shared `TaskForm`) shows an "Asignar a"
selector with the chosen group's members (default "Sin asignar") whenever the
scope is a group. A new nullable `assignee_id` column on `tasks` carries it
through sync (additive — RLS and the `tasks_guard` immutability trigger only
protect `owner_id`/`nucleus_id`, so they are untouched). Display shows "Asignada
a <persona>" on rows and the deck card; tasks assigned to the current user are
highlighted ("Para mí") and can be isolated with a "Solo mías" filter. Pure
domain helpers (`isMine`/`assignedToMe`, assignee normalization, `applyEdit`)
are test-first.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8
**Primary Dependencies**: Dexie (IndexedDB), @supabase/supabase-js (sync/RLS/Realtime), Zod v4
**Storage**: IndexedDB (Dexie) source of truth; Supabase Postgres for sync
**Testing**: Vitest (domain: assignment helpers, parse, applyEdit), Playwright (e2e, Supabase-gated for group flows)
**Target Platform**: Installable PWA; mobile-first
**Project Type**: Web app (single `apps/web` package)
**Performance Goals**: Assignment reflected locally within 1 s; visible to members within 5 s via Realtime
**Constraints**: Optional; only on group tasks; offline-capable; no ownership/scope mutation
**Scale/Scope**: One household; assignee is a single member id (or null)

## Constitution Check

- **I. Local-First** — PASS. Assignment is a local write queued for sync; no connectivity needed (group member list is already cached).
- **II. One Language, One Type System** — PASS. `assigneeId` defined once in `TaskSchema`; the SQL column maps through the single `mapping.ts` boundary. No duplicated types.
- **III. Spec Before Code** — PASS. spec.md + this plan merge before code.
- **IV. Test-First for Domain Logic** — PASS. Assignment helpers (`isMine`, `assignedToMe`, `filterMine`), assignee normalization in parse, and `applyEdit` reassignment are pure and unit-tested first.
- **V. Cheap by Default** — PASS. One nullable column; no new service/dependency.
- **VI. Single Deployable Environment** — PASS. One additive migration; no destructive change.
- **VII. Simplicity Over Framework Magic** — PASS. Reuses the shared `TaskForm` and the existing member cache; assignee is a plain id field, no join table.
- **VIII. Tenant-Ready Data Model** — PASS. `assignee_id` is additive and nullable; it never changes `owner_id`/`nucleus_id`, so the guard trigger and isolation tests still hold. Visibility stays by nucleus membership (assignee is informational, not a visibility key).
- **IX. Mobile-First UI** — PASS. The selector, badge and filter toggle are verified at a narrow viewport; selector only appears for group scope.

**Result**: PASS — no violations.

## Project Structure

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── task.ts            # +assigneeId in TaskSchema/NewTaskInput; parse normalizes (group-only)
│   │   ├── assignment.ts      # NEW pure: isMine / assignedToMe / filterMine
│   │   ├── assignment.test.ts # NEW test-first
│   │   ├── edit.ts            # applyEdit reassigns group tasks (assignee from parsed)
│   │   └── *.test.ts          # makeTask fixtures gain assigneeId: null
│   ├── data/
│   │   ├── taskRepository.ts  # createTask sets assignee (group-only); successor inherits it
│   │   ├── db.ts              # Dexie v7: backfill assigneeId = null
│   │   └── sync/mapping.ts    # assignee_id ⇄ assigneeId
│   │   └── database.types.ts  # +assignee_id on tasks Row/Insert/Update
│   ├── components/
│   │   ├── TaskForm.tsx       # "Asignar a" selector for group scope (create + edit)
│   │   ├── taskFormInitial.ts # initial carries nucleusId + assigneeId
│   │   ├── TaskItem.tsx       # pass currentUserId; "Para mí" highlight
│   │   ├── TaskBody.tsx (TaskItem) # "Asignada a <persona>"
│   │   ├── TaskCard.tsx/TaskDeck.tsx # show assignee on the card back
│   │   ├── TaskGroups.tsx     # "Solo mías" toggle; filter by isMine; thread currentUserId
│   │   └── useCurrentUserId.ts# NEW reactive hook over sessionStore
│   └── index.css              # assignee line, "Para mí" badge, filter toggle (mobile-first)
├── supabase/migrations/
│   └── 20260625120000_task_assignee.sql  # NEW: add nullable assignee_id (FK profiles, on delete set null)
└── tests/e2e/
    └── assign-tasks.spec.ts   # NEW (Supabase-gated): assign on create, reassign on edit, "Para mí", "Solo mías"
```

**Structure Decision**: Existing single-package web app. Assignee is a single
nullable id reusing the cached group membership; no join table (Principle VII).
The migration is additive and leaves RLS/guard untouched (Principle VIII).

## Complexity Tracking

No constitution violations — section intentionally empty.
