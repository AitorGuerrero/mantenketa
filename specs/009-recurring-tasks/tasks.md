---
description: "Task list for feature 009 — recurring tasks"
---

# Tasks: Recurring Tasks

**Input**: Design documents from `/specs/009-recurring-tasks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/recurrence.md, quickstart.md

**Tests**: REQUIRED — Principle IV: the next-date calculation, deterministic
successor id and the materialize/skip/stop transitions are test-first.

**Organization**: by user story (US1 → US2 → US3) after a blocking foundation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1/US2/US3 for story-phase tasks only

---

## Phase 1: Setup & schema

- [X] T001 Add the deterministic-id dependency: `pnpm --filter @mantenketa/web add uuid` and `pnpm --filter @mantenketa/web add -D @types/uuid`
- [X] T002 Write `supabase/migrations/20260615140000_recurring_tasks.sql` (add nullable `recurrence jsonb` and `series_id uuid` to `public.tasks`) and apply with `supabase db push`
- [X] T003 Regenerate `apps/web/src/data/database.types.ts` (`supabase gen types typescript --linked`); verify it compiles

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Persist and sync recurrence across the stack. No story work until done.

- [X] T004 Dexie **v6** in `apps/web/src/data/db.ts`: `db.version(6)` upgrade backfilling `recurrence = null` and `seriesId = null` (no index change)
- [X] T005 `apps/web/src/domain/task.ts`: add `RecurrenceSchema` (freq enum, interval int ≥1, anchor enum); extend `TaskSchema` with `recurrence` (nullable) and `seriesId` (nullable); extend `NewTaskInput` with optional `recurrence`; update all `makeTask` test helpers (`recurrence: null`, `seriesId: null`) across the domain/data test files
- [X] T006 Carry the new fields through sync: `apps/web/src/data/sync/mapping.ts` (`taskToRow`/`rowToTask` map `recurrence` + `series_id`) and the outbox UPDATE in `apps/web/src/data/sync/syncEngine.ts`

**Checkpoint**: recurrence persists locally and round-trips through sync.

---

## Phase 3: User Story 1 - Complete a recurring task and get the next one (Priority: P1) 🎯 MVP

**Goal**: Create a recurring task (freq + interval, anchor default completion, works dateless); completing it spawns the next pending instance.

**Independent Test**: "Regar plantas" recurring weekly, no date; mark done → completed one in "Hechas recientemente" and a new pending one dated +7 days, still recurring.

### Tests for User Story 1 ⚠️ (write FIRST, confirm FAILING)

- [X] T007 [P] [US1] Unit tests `apps/web/src/domain/recurrence.test.ts`: `nextOccurrenceDate` daily/weekly; `cadenceLabel` ("cada día"/"cada 2 semanas"…); `successorId` deterministic (same inputs → same uuid, different date → different uuid)
- [X] T008 [P] [US1] Unit tests `apps/web/src/domain/task.test.ts`: `parseNewTask` defaults `recurrence` to null; preserves a valid recurrence
- [X] T009 [P] [US1] e2e `apps/web/tests/e2e/recurring-tasks.spec.ts`: create weekly (anchor completion, no date) → "cada semana" badge; mark done → completed shows in "Hechas recientemente" and a new pending instance appears dated +7 days

### Implementation for User Story 1

- [X] T010 [US1] `apps/web/src/domain/recurrence.ts`: implement `nextOccurrenceDate` (daily/weekly/monthly/yearly with month-end clamp), `cadenceLabel`, `successorId` (uuid v5 + fixed namespace) — makes T007 pass
- [X] T011 [US1] `apps/web/src/domain/task.ts` + `apps/web/src/data/taskRepository.ts`: `parseNewTask` recurrence handling; `createTask` assigns a fresh `seriesId` + stores `recurrence` when recurring (else both null)
- [X] T012 [US1] `apps/web/src/data/taskRepository.ts`: `markDone` of a recurring task inserts the successor (deterministic id, next date by anchor: completion→today, dueDate→taskDate) in the same rw transaction + outbox; idempotent; `revert` deletes the pending untouched successor
- [X] T013 [US1] `apps/web/src/components/CreateTaskForm.tsx`: "Repetir" toggle revealing frequency `<select>`, interval number (≥1) and anchor `<select>` ("Desde que la complete" default / "En la fecha prevista")
- [X] T014 [US1] `apps/web/src/components/TaskItem.tsx` (TaskBody) cadence badge via `cadenceLabel`, beside urgent/group badges; styles in `apps/web/src/index.css`

**Checkpoint**: recurring tasks can be created and regenerate on completion (MVP).

---

## Phase 4: User Story 2 - Calendar-anchored recurrence (from the due date) (Priority: P2)

**Goal**: Anchor the next date to the scheduled date so fixed-calendar tasks don't drift; month-end clamps.

**Independent Test**: "Pagar alquiler" monthly, anchor due date, dated the 1st; complete on the 3rd → next dated the 1st of next month.

### Tests for User Story 2 ⚠️ (write FIRST, confirm FAILING)

- [X] T015 [P] [US2] Unit tests `apps/web/src/domain/recurrence.test.ts`: monthly/yearly cadence and month-end clamp (Jan 31 +1m → Feb 28/29; Feb 29 +1y → Feb 28)
- [X] T016 [P] [US2] e2e `apps/web/tests/e2e/recurring-tasks.spec.ts`: monthly anchor "due date" dated the 1st, completed late → next on the 1st of next month

### Implementation for User Story 2

- [X] T017 [US2] `apps/web/src/domain/task.ts` + `apps/web/src/data/taskRepository.ts`: validate that `anchor === 'dueDate'` requires a `taskDate` (ValidationError otherwise); confirm `markDone` uses the scheduled date as base when anchored to due date (clamp covered by T010/T015)

**Checkpoint**: both anchors correct; US1 + US2 work.

---

## Phase 5: User Story 3 - Skip an occurrence or stop repeating (Priority: P3)

**Goal**: Skip the current occurrence (advance date, no completion) and stop a series (clear recurrence).

**Independent Test**: weekly task → "Saltar" advances the date one week with no completion; "No repetir más" → completing it spawns no successor.

### Tests for User Story 3 ⚠️ (write FIRST, confirm FAILING)

- [X] T018 [P] [US3] e2e `apps/web/tests/e2e/recurring-tasks.spec.ts`: skip advances the pending date by one interval with no completion recorded; "no repetir más" removes the badge and completing it creates no successor

### Implementation for User Story 3

- [X] T019 [US3] `apps/web/src/data/taskRepository.ts`: `skipOccurrence(id)` (advance `taskDate` in place by anchor base; stays pending) and `stopRecurrence(id)` (set `recurrence = null`); both stamp `updatedAt` + enqueue outbox
- [X] T020 [US3] Skip / "No repetir más" actions on recurring tasks in `apps/web/src/components/TaskItem.tsx` (list) and `apps/web/src/components/TaskCard.tsx` + `TaskDeck.tsx` (deck); styles in `apps/web/src/index.css`

**Checkpoint**: all three stories independently functional.

---

## Phase 6: Polish & validation

- [X] T021 [P] Verify every new/changed view at a narrow mobile viewport (Principle IX); tidy recurrence control + badge + action styles
- [X] T022 Full validation: `pnpm test`, `pnpm test:rls`, `pnpm lint`, `pnpm build`, `pnpm test:e2e` all green; features 001–008 regression-free; run `quickstart.md` smoke; mark tasks complete

---

## Dependencies & Execution Order

- **Phase 1 (T001–T003)**: no deps; blocks everything (dep + schema + types).
- **Phase 2 (T004–T006)**: after Phase 1; blocks all stories.
- **US1 (T007–T014)**: after Phase 2. MVP. Tests (T007–T009) before impl; T010 before T012/T014; T011 before T012.
- **US2 (T015–T017)**: after Phase 2; reuses `recurrence.ts` from US1 (T010). Independent of US3.
- **US3 (T018–T020)**: after Phase 2; the deck/list actions build on existing components.
- **Polish (T021–T022)**: after the desired stories.

### Parallel opportunities
- T007/T008/T009 are [P]; T015/T016 are [P]; T018 is [P].
- After Phase 2, US1/US2/US3 implementation touch mostly different concerns (US2 = validation/anchor base; US3 = skip/stop) and can overlap, with care around shared files (`task.ts`, `taskRepository.ts`).

---

## Implementation Strategy

- **MVP**: Phase 1 → Phase 2 → US1 (recurring create + materialize-on-complete), validate, demo.
- **Incremental**: add US2 (due-date anchor + clamp), then US3 (skip/stop).
- The next-date calculation and deterministic successor id are the test-first core (Principle IV); cross-device dedup is proven by the `successorId` unit test.

## Notes

- New dependency `uuid` (v5) only for deterministic successor identity (research Decision 4 / Principle VII).
- Internal column name `nucleus_id` kept (feature 008 decision); user-facing term "grupo".
- RLS, Realtime and the pull query are unchanged; the successor is a normal task row.
- Total: 22 tasks (Setup 3, Foundational 3, US1 8, US2 3, US3 3, Polish 2).
