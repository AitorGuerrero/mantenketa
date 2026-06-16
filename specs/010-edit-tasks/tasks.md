---
description: "Task list for feature 010 — edit tasks"
---

# Tasks: Edit Tasks

**Input**: Design documents from `/specs/010-edit-tasks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/edit.md, quickstart.md

**Tests**: REQUIRED — Principle IV: `applyEdit` is a state transition over a task
(test-first). Validation reuses the already-tested `parseNewTask`.

**Organization**: a blocking foundation (edit primitive + reusable form) then
user stories US1 → US2 → US3. Client-only: no migration, RLS or type changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1/US2/US3 for story-phase tasks only

---

## Phase 1: Foundational (blocking prerequisites)

**Purpose**: The edit primitive and the reusable form that every story builds on.

- [X] T001 [P] Test-first `apps/web/src/domain/edit.test.ts` for `applyEdit(task, parsed, now, newSeriesId)`: preserves `id`/`ownerId`/`nucleusId`/`completedAt`/`completedBy`/`createdAt`; sets `name`/`taskDate`/`description`/`urgent`/`recurrence` from parsed and `updatedAt = now`; enabling recurrence on a one-off (`seriesId === null`) uses `newSeriesId`; keeps existing `seriesId` when already recurring; disabling recurrence yields `recurrence: null`
- [X] T002 `apps/web/src/domain/edit.ts`: implement pure `applyEdit` — makes T001 pass
- [X] T003 `apps/web/src/data/taskRepository.ts`: add `editTask(taskId, input)` to the interface and class — validate with `parseNewTask`; in one rw transaction load the task (missing → throw), no-op if completed, else `applyEdit(existing, parsed, now, crypto.randomUUID())`, `put`, enqueue outbox, `scheduleFlush()`; ignore `input.nucleusId` (scope immutable)
- [X] T004 Generalize `apps/web/src/components/CreateTaskForm.tsx` → `apps/web/src/components/TaskForm.tsx`: props `mode` ('create'|'edit'), `initial` (name/taskDate/description/urgent/recurrence), `submitLabel`, `onSubmit`, `onCreated`, `onCancel`; pre-fill state from `initial`; render the scope `<select>` only in create mode; update `apps/web/src/pages/TasksPage.tsx` to use `TaskForm` in create mode (behavior unchanged)

**Checkpoint**: editing works at the data layer and the form can render pre-filled.

---

## Phase 2: User Story 1 - Edit a pending task's details (Priority: P1) 🎯 MVP

**Goal**: From a pending task in the list, edit name/date/description/urgent reusing the form; save updates in place, cancel discards, same validation as creation.

**Independent Test**: Edit "Compra" → "Comprar pan" + date + urgent, save → updated in place, no duplicate; clear the date → moves to "ya"; blank name → rejected; cancel → unchanged.

### Tests for User Story 1 ⚠️ (write FIRST, confirm FAILING)

- [X] T005 [P] [US1] e2e `apps/web/tests/e2e/edit-tasks.spec.ts`: open "Editar" on a pending list task → form pre-filled; change name + set date + toggle urgent + save → reflected in place, no duplicate; clear date + save → task in "Para hacer ya"; blank name + save → validation message, unchanged; cancel → unchanged

### Implementation for User Story 1

- [X] T006 [US1] `apps/web/src/components/TaskItem.tsx`: show an "Editar" control on pending tasks (hidden when completed); toggling it renders `TaskForm` in edit mode in place of the row, pre-filled, submit label "Guardar"; on submit call `taskRepository.editTask(task.id, input)` and close; cancel restores the row
- [X] T007 [US1] `apps/web/src/index.css`: styles for the "Editar" affordance and the in-place edit form (mobile-first)

**Checkpoint**: pending tasks are editable from the list (MVP).

---

## Phase 3: User Story 2 - Edit the recurrence of a task (Priority: P2)

**Goal**: From the same edit view, enable/disable repetition and change cadence (freq/interval/anchor); the new pattern applies to the next generated occurrence.

**Independent Test**: Edit a one-off → "cada 2 semanas", save → cadence badge; complete → successor uses it. Edit → disable, save → badge gone, completing spawns no successor. dueDate anchor without date → rejected.

### Tests for User Story 2 ⚠️ (write FIRST, confirm FAILING)

- [X] T008 [P] [US2] Extend `apps/web/tests/e2e/edit-tasks.spec.ts`: enable recurrence via edit → cadence badge appears and completing generates the next occurrence; change cadence; disable recurrence → badge gone and no successor on completion; setting "en la fecha prevista" with no date → rejected with the creation message

### Implementation for User Story 2

- [X] T009 [US2] In `apps/web/src/components/TaskForm.tsx`, confirm/wire edit-mode pre-fill of the recurrence controls (Repetir + cada N + frecuencia + ancla) from `initial.recurrence`; the persistence (series id on enable, null on disable) is handled by `applyEdit`/`editTask` from Phase 1 — verify it end-to-end

**Checkpoint**: recurrence is editable; US1 + US2 work.

---

## Phase 4: User Story 3 - Shared edits and the pending-only rule (Priority: P3)

**Goal**: Edit a pending task from the deck too; completed tasks offer no edit; group edits propagate to members (automatic via sync/Realtime).

**Independent Test**: Completed task shows no "Editar"; reverting reveals it. Editing the deck's top card works. (Signed-in) a member's edit to a shared task appears for the other within seconds.

### Tests for User Story 3 ⚠️ (write FIRST, confirm FAILING)

- [X] T010 [P] [US3] Extend `apps/web/tests/e2e/edit-tasks.spec.ts`: a completed task shows no "Editar" and after revert it reappears; (touch/deck project) the top card exposes "Editar" and editing it updates the task

### Implementation for User Story 3

- [X] T011 [US3] `apps/web/src/components/TaskCard.tsx` + `apps/web/src/components/TaskDeck.tsx`: add an "Editar" action for the deck's top (pending) card that shows `TaskForm` in edit mode for that task until save/cancel; styles in `apps/web/src/index.css`

**Checkpoint**: edit available in list and deck; pending-only enforced; group propagation works (no extra code — existing sync/RLS).

---

## Phase 5: Polish & validation

- [X] T012 [P] Verify the edit affordance and in-place form at a narrow mobile viewport (Principle IX); tidy styles and copy
- [X] T013 Full validation: `pnpm test`, `pnpm test:rls`, `pnpm lint`, `pnpm build`, `pnpm test:e2e` all green; features 001–009 regression-free; run `quickstart.md` smoke; mark tasks complete

---

## Dependencies & Execution Order

- **Phase 1 (T001–T004)**: blocks all stories. T001 before T002; T002 before T003; T004 independent of T001–T003 but shared by all stories.
- **US1 (T005–T007)**: after Phase 1. MVP. Test (T005) before impl (T006).
- **US2 (T008–T009)**: after Phase 1; reuses the form + `applyEdit`. Largely covered by Phase 1; mostly tests + edit-mode pre-fill verification.
- **US3 (T010–T011)**: after Phase 1; deck affordance builds on `TaskForm`/`editTask`.
- **Polish (T012–T013)**: after the desired stories.

### Parallel opportunities
- T001 is [P] (own file). T005/T008/T010 are [P] e2e additions (same spec file → coordinate, run after the prior story's impl).
- After Phase 1, US1/US3 UI work touches different components and can overlap.

---

## Implementation Strategy

- **MVP**: Phase 1 → US1 (edit content from the list), validate, demo.
- **Incremental**: add US2 (recurrence editing), then US3 (deck edit + pending-only).
- Client-only: no migration/RLS/type changes; editing reuses the existing sync UPDATE path (`owner_id`/`nucleus_id` untouched).

## Notes

- `applyEdit` is the test-first core (Principle IV); randomness (new series id) stays in `editTask` to keep the domain pure.
- Scope is immutable: `editTask` ignores `nucleusId`; the edit form hides the scope selector.
- Total: 13 tasks (Foundational 4, US1 3, US2 2, US3 2, Polish 2).
