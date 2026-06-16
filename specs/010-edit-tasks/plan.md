# Implementation Plan: Edit Tasks

**Branch**: `010-edit-tasks` | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-edit-tasks/spec.md`

## Summary

Let users edit a **pending** task's content — name, date (incl. clearing it →
"hacer ya"), description, urgent flag and the recurrence pattern — by reusing the
creation form in an "edit" mode opened from the task itself. Saving updates the
same task in place (local-first, queued for sync, LWW clock stamped); cancelling
discards. Scope (personal/group) stays immutable, completion state and series
membership are preserved.

Technical approach: **client-only, no backend change**. Editing mutates only
already-syncable fields (`name`, `task_date`, `description`, `urgent`,
`recurrence`, `series_id`); it never touches `owner_id`/`nucleus_id`, so the
`tasks_update` RLS policy and the `immutable_ownership` trigger are unaffected
and the outbox UPDATE payload already carries every edited field. The work is: a
pure `applyEdit` domain function (test-first), a thin `taskRepository.editTask`,
generalizing `CreateTaskForm` into a reusable `TaskForm` (create + edit), and an
"Editar" affordance on pending tasks in the list and the deck.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8

**Primary Dependencies**: Dexie (IndexedDB), @supabase/supabase-js (sync/RLS/Realtime), Zod v4

**Storage**: IndexedDB (Dexie) as read/write source of truth; Supabase Postgres for sync

**Testing**: Vitest (unit incl. the pure edit function), Playwright (e2e)

**Target Platform**: Installable PWA on Cloudflare Workers; mobile-first

**Project Type**: Web app (single `apps/web` package)

**Performance Goals**: Edit reflected locally within 1 s; group edit visible to members within 5 s via Realtime

**Constraints**: Offline-capable (edit queued like any write); no ownership/scope mutation; free tier

**Scale/Scope**: Single household; one form reused for create and edit

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Local-First** — PASS. Edit is a local write queued for sync; no edit needs connectivity. Offline Behavior section complete.
- **II. One Language, One Type System** — PASS. Reuses `NewTaskInput`/`parseNewTask` and `Recurrence`; the edit input is the same shape minus the immutable scope. No new SQL.
- **III. Spec Before Code** — PASS. spec.md + this plan.md merge before code.
- **IV. Test-First for Domain Logic** — PASS. The edit is modeled as a pure `applyEdit(task, parsed, now)` (state transition over a task) with failing unit tests first: preserves id/owner/scope/completion/createdAt, stamps updatedAt, and assigns a series id when recurrence is newly enabled. Validation reuses the already-tested `parseNewTask`.
- **V. Cheap by Default** — PASS. No new services or dependencies.
- **VI. Single Deployable Environment** — PASS. No migration; nothing to deploy beyond the static app.
- **VII. Simplicity Over Framework Magic** — PASS. Generalizes the existing form rather than adding a second one; one small pure function; no new abstraction layer.
- **VIII. Tenant-Ready Data Model** — PASS. Editing never changes `owner_id`/`nucleus_id`; RLS and the `immutable_ownership` trigger are untouched, so existing isolation tests still hold. No new visibility surface.
- **IX. Mobile-First UI** — PASS. The edit view reuses the mobile-first create form; the "Editar" affordance is verified at a narrow viewport.

**Result**: PASS — no violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/010-edit-tasks/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── edit.md          # Phase 1 output
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks output (later)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── edit.ts            # NEW pure: applyEdit(task, parsed, now) → updated Task
│   │   ├── edit.test.ts       # NEW test-first
│   │   └── task.ts            # reuse parseNewTask/NewTaskInput (no shape change)
│   ├── data/
│   │   └── taskRepository.ts  # NEW editTask(taskId, input): validate + applyEdit + persist + outbox
│   ├── components/
│   │   ├── TaskForm.tsx       # CreateTaskForm generalized: create + edit modes (initial values,
│   │   │                      #   submit label, scope shown only on create)
│   │   ├── TaskItem.tsx       # "Editar" on pending tasks; edit-in-place (swap row → TaskForm)
│   │   ├── TaskCard.tsx       # "Editar" on the deck's top card
│   │   └── TaskDeck.tsx       # show the edit form for the top card while editing
│   ├── pages/
│   │   └── TasksPage.tsx      # uses TaskForm in create mode (unchanged behavior)
│   └── index.css             # edit affordance styles (mobile-first)
└── tests/
    └── e2e/
        └── edit-tasks.spec.ts # NEW: edit fields, clear date, recurrence on/off, cancel, pending-only
```

**Structure Decision**: Existing single-package web app. `CreateTaskForm` is
generalized into `TaskForm` (create + edit) to avoid a second form (Principle
VII); the edit transition is a pure `domain/edit.ts` (test-first) wrapped by a
thin `taskRepository.editTask`. No backend, migration or type regeneration.

## Complexity Tracking

No constitution violations — section intentionally empty.
