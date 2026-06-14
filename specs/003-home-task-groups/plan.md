# Implementation Plan: Home Refactor — Grouped Task Lists & Create Button

**Branch**: `003-home-task-groups` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-home-task-groups/spec.md`

## Summary

Refactor the home from one flat task list into three derived groups —
**Para hacer ya** (dateless + due today/earlier, overdue highlighted),
**Para hacer pronto** (future, date ascending), **Hechas recientemente** (5 most
recent completed, newest first) — and hide the creation form behind a
**"Nueva tarea"** button that opens/closes it. The grouping is a pure function
of each task's date and completion state compared against the device's local
day; no persisted data, schema, or backend change. The grouping/overdue logic
is test-first domain code (Principle IV); everything else is UI re-composition
over the existing repository and sync.

See [research.md](./research.md) for decisions, [data-model.md](./data-model.md)
for the derived grouping (no schema change), and
[contracts/grouping.md](./contracts/grouping.md) for the pure function the UI binds to.

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: React 18, Dexie + dexie-react-hooks (existing
`observeTasks` live query); no new dependencies

**Storage**: Unchanged — IndexedDB via Dexie; grouping derived at render time

**Testing**: Vitest (unit — pure `groupTasks`, test-first), Playwright (e2e —
grouped home + create-button toggle)

**Target Platform**: Installable PWA (mobile-first)

**Project Type**: Static SPA (no backend change)

**Performance Goals**: Grouping is O(n) over a few hundred local tasks;
re-group on each live-query emission; group change visible < 1s (SC-004)

**Constraints**: Fully offline (Principle I); mobile-first layout (Principle IX);
no schema change

**Scale/Scope**: One household, a few hundred tasks

## Constitution Check

*(Evaluated against Constitution v4.1.0.)*

| # | Principle | Status | How this plan complies |
|---|-----------|--------|------------------------|
| I | Local-First | ✅ PASS | Pure presentation over local data + device date; fully offline. No new writes. |
| II | One Language, One Type System | ✅ PASS | TypeScript only; grouping reuses the single `Task` type; no SQL. |
| III | Spec Before Code | ✅ PASS | spec.md (checklist 16/16) + this plan precede code. |
| IV | Test-First for Domain Logic | ✅ PASS | `groupTasks()` performs **overdue detection + grouping** → failing-first unit tests before implementation. UI/toggle covered by e2e. |
| V | Cheap by Default | ✅ PASS | No new services or dependencies. |
| VI | Single Deployable Environment | ✅ PASS | Same single Pages/Workers + Supabase; no env change. |
| VII | Simplicity Over Framework Magic | ✅ PASS | One pure function + UI re-composition; no new abstraction, no router change, no state library. Form open/close is local component state. |
| VIII | Tenant-Ready Data Model | ✅ PASS (N/A) | No new entity. Grouping consumes whatever `observeTasks()` already returns (RLS/scope-filtered upstream), so isolation is unaffected. |
| IX | Mobile-First UI | ✅ PASS | The three groups stack vertically as the base (mobile) layout; the "Nueva tarea" button reclaims phone screen space vs the always-on form. Verified at a narrow viewport; any multi-column treatment would be `min-width` only. |

**Result**: All gates pass → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-home-task-groups/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 — derived grouping (no schema change)
├── quickstart.md        # Phase 1 — verification steps
├── contracts/
│   └── grouping.md      # the pure groupTasks() contract the UI binds to
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/src/
├── domain/
│   ├── grouping.ts        # NEW — pure groupTasks(tasks, today) → {ya, pronto, hechas}
│   │                      #   (overdue/today/future detection) — test-first
│   ├── grouping.test.ts   # NEW — failing-first unit tests
│   ├── ordering.ts        # existing sortTasks (reused within groups)
│   └── task.ts            # existing Task type + isDone (unchanged)
├── components/
│   ├── TaskGroups.tsx     # NEW — renders the three sections (overdue highlight,
│   │                      #   empty hints); reuses the shared TaskItem rendering
│   ├── TaskList.tsx       # refactor: extract a reusable TaskItem
│   └── CreateTaskForm.tsx # add onCancel + a Cancelar control
└── pages/
    └── TasksPage.tsx      # "Nueva tarea" button toggles the form (local state);
                           #   renders TaskGroups
apps/web/tests/e2e/
├── home-groups.spec.ts    # NEW — grouping + overdue highlight + move on done/revert
└── create-button.spec.ts  # NEW — form hidden by default, opens/closes
```

**Structure Decision**: Single app, no new packages. The only new domain unit is
the pure `groupTasks` function (one clear responsibility, test-first). UI work is
re-composition of existing components; `TaskItem` is extracted so the three
sections share identical task rendering (avoids duplication — Principle VII).

## Complexity Tracking

> No constitution violations — no entries required.
