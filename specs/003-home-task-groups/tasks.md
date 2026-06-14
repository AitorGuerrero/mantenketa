---
description: "Task list for feature 003 — Home refactor (grouped lists + create button)"
---

# Tasks: Home Refactor — Grouped Task Lists & Create Button

**Input**: Design documents from `/specs/003-home-task-groups/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/grouping.md

**Tests**: Constitution v4.1.0 Principle IV mandates failing-first unit tests for
the **grouping/overdue** logic (`groupTasks`). UI is exempt from test-first but
covered by Playwright e2e before the feature is complete.

**Organization**: by user story. Stack: `apps/web` PWA, no backend/schema change.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational (shared, blocks the stories)

- [X] T001 Extract the local-day helper: add `todayIsoDate()` in `apps/web/src/domain/date.ts` (pure, device local `YYYY-MM-DD`) and reuse it from `apps/web/src/data/taskRepository.ts` (replace its private copy)

---

## Phase 2: US1 — See tasks grouped by urgency (P1) 🎯 MVP

### Tests first (must FAIL) ⚠️

- [X] T002 [P] [US1] Failing unit tests for `groupTasks(tasks, today)` in `apps/web/src/domain/grouping.test.ts`: partition (each task in exactly one group), ya = dateless + `taskDate <= today` (dateless first then date asc), `isOverdue` true only for `taskDate < today` (today not overdue), pronto = `taskDate > today` asc, hechas = completed newest-first capped at 5, purity (no mutation)

### Implementation

- [X] T003 [US1] Implement pure `groupTasks(tasks, today): GroupedTasks` in `apps/web/src/domain/grouping.ts` per contracts/grouping.md (makes T002 pass; reuse `sortTasks` semantics within groups)
- [X] T004 [US1] Extract a reusable `TaskItem` (checkbox done/revert, date or "Hacer ya", "Hecha el … por …", "Núcleo" badge) from `apps/web/src/components/TaskList.tsx` into `apps/web/src/components/TaskItem.tsx`; accept an `overdue` prop for the highlight
- [X] T005 [US1] Build `TaskGroups` in `apps/web/src/components/TaskGroups.tsx`: subscribe to `observeTasks`, compute `groupTasks(tasks, todayIsoDate())`, render the three sections ("Para hacer ya", "Para hacer pronto", "Hechas recientemente") with per-group empty hints and overdue highlight on ya-items (depends on T003, T004)
- [X] T006 [P] [US1] Overdue + section styling in `apps/web/src/index.css` (`.task-item--overdue`, group headings/spacing), mobile-first (base = stacked; any columns via `min-width`)
- [X] T007 [US1] Failing Playwright e2e in `apps/web/tests/e2e/home-groups.spec.ts`: tasks land in the right group (dateless/past/today → ya; future → pronto; completed → hechas), overdue highlighted, today not highlighted, only 5 most-recent completed shown, mark-done moves to hechas and revert moves back

**Checkpoint**: home shows the three groups correctly; US1 shippable.

---

## Phase 3: US2 — Create a task from a button (P2)

- [X] T008 [US2] Add `onCancel` + a "Cancelar" control to `apps/web/src/components/CreateTaskForm.tsx` (keep validation; report success so the parent can close)
- [X] T009 [US2] In `apps/web/src/pages/TasksPage.tsx`: render `TaskGroups`; add a "Nueva tarea" button that toggles `CreateTaskForm` (local state); close on successful save or cancel; remove the always-visible form
- [X] T010 [P] [US2] Failing Playwright e2e in `apps/web/tests/e2e/create-button.spec.ts`: form hidden by default, "Nueva tarea" opens it, valid save creates + closes + task appears in its group, invalid save keeps it open with the message, cancel closes without creating

**Checkpoint**: create flow gated behind the button; US1 + US2 complete.

---

## Phase 4: Polish & Validation

- [X] T011 [P] SPDX headers on new files (`date.ts`, `grouping.ts`, `grouping.test.ts`, `TaskItem.tsx`, `TaskGroups.tsx`, new specs)
- [X] T012 Full validation: `pnpm test` (unit incl. groupTasks), `pnpm lint`, `pnpm build`, `pnpm test:e2e` all green; feature 001/002 e2e regression-free; verify quickstart steps incl. narrow-viewport (Principle IX)

---

## Dependencies & Execution Order

- Phase 1 → US1 → US2 → Polish.
- Test-first: T002 (fail) → T003. e2e (T007, T010) may be written alongside but
  must fail before their implementation lands.
- T004 (extract TaskItem) precedes T005 (TaskGroups uses it) and T009.

## Notes

- No schema/Dexie/Supabase change; grouping derived at render time.
- Total: 12 tasks (Foundational 1, US1 6, US2 3, Polish 2).
