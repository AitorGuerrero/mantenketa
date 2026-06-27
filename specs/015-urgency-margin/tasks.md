---
description: "Task list for feature 015 — time-based urgency margin"
---
# Tasks: Urgency Margin (time-based urgency)

**Input**: design docs in `/specs/015-urgency-margin/` (plan, spec, research, data-model, contracts/urgency.md, quickstart)

**Tests**: Principle IV — `isUrgent` is derived/overdue-like logic and `applyEdit`
is a state transition, so both get **failing-first** unit tests. UI/sync via e2e
(+ the existing RLS suite, unaffected).

**Setup**: none — existing single-package `apps/web`; no new deps or tooling.

**Format**: `[ID] [P?] [Story?] Description (file path)` · [P] = parallelizable (different files, no incomplete deps)

---

## Phase 1: Foundational — field swap, schema & data layer (BLOCKS all stories)

**Purpose**: Replace stored `urgent: boolean` with `urgencyMargin: number | null`
end-to-end through persistence and pure data passthroughs. The build stays red
until US1 wires the engine/UI; commit this phase as one logical group.

- [X] T001 Migration `supabase/migrations/20260627120000_task_urgency_margin.sql`: `add column urgency_margin int check (urgency_margin is null or urgency_margin >= 0)`, `update … set urgency_margin = case when urgent then 0 else null end`, `drop column urgent`; apply with `supabase db push`
- [X] T002 [P] Regenerate `apps/web/src/data/database.types.ts` (tasks has `urgency_margin: number | null`, `urgent` gone)
- [X] T003 [P] Dexie v9 in `apps/web/src/data/db.ts`: `db.version(9)` upgrade — `row.urgencyMargin = row.urgent ? 0 : null` then `delete row.urgent` (no new index)
- [X] T004 Replace the field across the domain type and pure passthroughs: `apps/web/src/domain/task.ts` (`Task.urgencyMargin` = `z.number().int().min(0).nullable()`; `NewTaskInput.urgencyMargin?` + preprocess `''`/`undefined`/`NaN` ⇒ `null`; remove `urgent`), `apps/web/src/data/sync/mapping.ts` (`urgency_margin ↔ urgencyMargin`), `apps/web/src/data/sync/syncEngine.ts` (outbox UPDATE payload), `apps/web/src/data/taskRepository.ts` (`createTask` stores `urgencyMargin`), `apps/web/src/domain/edit.ts` (`applyEdit` maps `urgencyMargin`), `apps/web/src/components/taskFormInitial.ts` (`urgencyMargin: number | null`); update `makeTask`/fixtures in unit tests to `urgencyMargin`

**Checkpoint**: data round-trips the margin; urgency behaviour not yet derived.

---

## Phase 2: User Story 1 — grace period on dated tasks (Priority: P1) 🎯 MVP

**Goal**: A dated task becomes urgent on its own once its margin elapses past its
due date; urgent tasks float to the top of "Para hacer ya" and are marked.

**Independent Test**: dated task with `due+margin` in the past ⇒ urgent & top of
"ya"; overdue-but-within-grace ⇒ present, not urgent; no margin ⇒ never urgent.

- [X] T005 [P] [US1] Failing-first unit tests for dated `isUrgent` per contracts truth table (margin 0 at/after due, margin N boundary `=`/`<`, `null` never, future due not urgent) in `apps/web/src/domain/urgency.test.ts`
- [X] T006 [P] [US1] Failing-first unit tests: `orderYa` urgent-first via urgency computed against `today` (sub-order preserved); overdue-within-grace not urgent in `apps/web/src/domain/grouping.test.ts`
- [X] T007 [US1] Add `localDay(iso)` to `apps/web/src/domain/date.ts`; implement pure `isUrgent(task, today)` in new `apps/web/src/domain/urgency.ts` (`reference = taskDate ?? localDay(createdAt)`; `daysBetween(reference, today) >= margin`) — makes T005 pass
- [X] T008 [US1] `apps/web/src/domain/grouping.ts`: add `isUrgent` to `TaskInGroup`, compute it in `groupTasks` for ya/pronto/hechas, and float urgent-first in `orderYa` using the computed value (replace `a.urgent`) — makes T006 pass
- [X] T009 [US1] Components read computed urgency from `group.isUrgent` (not `task.urgent`): badge + `task-item--urgent` in `apps/web/src/components/TaskItem.tsx`; `task-card--urgent` + back badge in `TaskCard.tsx`; `task-card-peek--urgent` in `TaskDeck.tsx` (marker styles reused from 007)
- [X] T010 [US1] `apps/web/src/components/TaskForm.tsx`: "Urgente" toggle reveals a numeric "días tras la fecha" field (default 0) → `urgencyMargin` when a date is set; toggle off ⇒ `null`; minor styling in `apps/web/src/index.css`
- [X] T011 [US1] Playwright `apps/web/tests/e2e/urgency-margin.spec.ts` (replaces `urgent-tasks.spec.ts`): elapsed margin ⇒ urgent + top of "ya"; overdue within grace ⇒ not urgent; no margin ⇒ never urgent; a pre-existing 007 urgent task still urgent

**Checkpoint**: dated time-based urgency fully functional and testable.

---

## Phase 3: User Story 2 — margin on dateless tasks, from creation (Priority: P2)

**Goal**: A dateless task uses the same margin measured from its creation day;
margin 0 = "urgente ya mismo". Builds on the US1 engine (reference falls back to
the creation day), independently testable.

**Independent Test**: dateless + margin 0 ⇒ urgent now; dateless + margin 1 ⇒ not
urgent today, urgent after a day; dateless + no margin ⇒ never.

- [X] T012 [P] [US2] Failing-first unit tests for dateless `isUrgent` (reference = `localDay(createdAt)`: margin 0 now, margin 1 next day, `null` never) in `apps/web/src/domain/urgency.test.ts`
- [X] T013 [US2] `apps/web/src/components/TaskForm.tsx`: when no date, label the field "tras crearla (0 = ya mismo)" and ensure toggle-on + days produces `urgencyMargin` with `taskDate = null` — makes T012 covered end-to-end
- [X] T014 [US2] Extend `apps/web/tests/e2e/urgency-margin.spec.ts`: dateless "ya mismo" urgent immediately; dateless 1-day margin not urgent on creation day

**Checkpoint**: dateless urgency works; US1 + US2 both independently testable.

---

## Phase 4: User Story 3 — edit urgency on an existing task (Priority: P3)

**Goal**: Editing a task can add/change/clear the margin (reusing the 010 edit
form); urgency recomputes from the new values.

**Independent Test**: edit a task to add an already-elapsed margin ⇒ becomes
urgent; edit to clear it ⇒ stops being urgent.

- [X] T015 [P] [US3] Failing-first unit tests in `apps/web/src/domain/edit.test.ts`: `applyEdit` sets and clears `urgencyMargin`, preserves id/owner/scope/completion/createdAt, stamps `updatedAt`
- [X] T016 [US3] Confirm the reused edit form prefilled state maps `urgencyMargin` → toggle + days in `apps/web/src/components/taskFormInitial.ts` / `TaskForm.tsx` (edit mode) — makes T015 pass end-to-end
- [X] T017 [US3] Extend `apps/web/tests/e2e/urgency-margin.spec.ts`: add a small elapsed margin to an existing task ⇒ urgent; clear it ⇒ no longer urgent

**Checkpoint**: all three stories independently functional.

---

## Phase 5: Polish & validation

- [X] T018 Confirm no `urgent` symbol remains outside git history: `grep -rni "\burgent\b" apps/web/src` returns only `urgencyMargin`/`--urgent` CSS/marker names; tidy stale comments in `apps/web/src/index.css` and `db.ts`
- [~] T019 Full validation: tsc, `pnpm test` (135 unit ✅), lint ✅, build ✅, local e2e (urgency-margin 7/7 ✅) — green. **Pending**: apply the migration to Supabase (`supabase db push`); until then the 4 multi-user/Realtime e2e (assign/adoption/nucleus/projects) fail because the synced row carries `urgency_margin` and the DB still has `urgent` (verified passing on baseline). Re-run `pnpm test:e2e` + RLS suite after the push.

---

## Dependencies & Execution Order

- **Phase 1 (Foundational)** blocks everything. Within it: T001 → T002; T003 and T004 [P] with each other; all of T001–T004 land as one compiling group with US1.
- **US1 (P1)** depends only on Phase 1. T005/T006 [P] (test-first) precede T007/T008; T009/T010 after T008; T011 after T007–T010.
- **US2 (P2)** depends on the US1 engine (T007). T012 (test) → T013 → T014.
- **US3 (P3)** depends on Phase 1 (`applyEdit` field) + the form (T010/T013). T015 → T016 → T017.
- **Polish** after all desired stories.

### Within each story
Test-first: T005/T006, T012, T015 are written and FAIL before their implementation.

### Parallel opportunities
- T002, T003 in parallel (different files).
- T005 ∥ T006, then T007 ∥ (none — T008 depends on grouping but not on urgency.ts internals; still keep T007 before T008 since grouping imports `isUrgent`).
- T012 and T015 can be authored in parallel with US1 verification once the engine (T007) exists.

---

## Implementation Strategy

- **MVP = Phase 1 + US1**: dated grace-period urgency, marked and ordered. Stop and validate (T011) before continuing.
- **Incremental**: add US2 (dateless) → US3 (edit), each independently testable, no regression to earlier stories.

## Notes
- Field replacement (`urgent` → `urgencyMargin`) is atomic for compilation; the
  build only goes green once US1 wires the engine, grouping and UI.
- Migration backfill (`urgent ? 0 : null`) preserves all existing urgency.
- Urgent tasks are always within "Para hacer ya" by construction (reference ≤ today).
- Total: 19 tasks.
