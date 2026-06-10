---
description: "Task list for feature 001 — Task Create & Complete"
---

# Tasks: Task Create & Complete

**Input**: Design documents from `/specs/001-task-create-complete/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/data-access.md

**Tests**: REQUIRED for domain logic. Constitution Principle IV (Test-First for
Domain Logic, NON-NEGOTIABLE) mandates failing-first unit tests for the **list
ordering** function and the **completion state-transition** logic. UI and the
Dexie repository are exempt from test-first but MUST have tests before the
feature is complete (Playwright e2e covers them).

**Organization**: Tasks grouped by user story. Stack: single Vite + React + TS
PWA under `apps/web`, local-only (Dexie/IndexedDB), pnpm. No backend.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 for user-story phases
- All paths are relative to repo root; the app lives under `apps/web/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling

- [X] T001 Scaffold the app: create `pnpm-workspace.yaml` (packages: `apps/*`) and an `apps/web` Vite + React + TypeScript project with strict `tsconfig.json` and `apps/web/vite.config.ts`
- [X] T002 Add dependencies and `apps/web/package.json` metadata including `"license": "AGPL-3.0-or-later"` — runtime: `react`, `react-dom`, `dexie`, `dexie-react-hooks`, `zod`, `vite-plugin-pwa`; dev: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`
- [X] T003 [P] Configure ESLint + Prettier (`apps/web/.eslintrc.cjs`, `apps/web/.prettierrc`) with TypeScript-strict rules and no-`any`
- [X] T004 [P] Configure test runners: `apps/web/vitest.config.ts` (jsdom env) and `apps/web/playwright.config.ts`
- [X] T005 [P] Configure `vite-plugin-pwa` in `apps/web/vite.config.ts` — web app manifest + precache the app shell (no runtime API caching; there is no API)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The domain type and local store that BOTH user stories depend on

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete

- [X] T006 [P] Define the `Task` type and `TaskSchema` (Zod) + `NewTaskInput` in `apps/web/src/domain/task.ts` per data-model.md (`id`, `name`, `taskDate`, `completedAt`, `createdAt`; no `ownerId`/`updatedAt` this phase)
- [X] T007 Set up the Dexie database in `apps/web/src/data/db.ts` — single `tasks` store keyed by `id`, indexes on `taskDate`, `completedAt`, `createdAt` (`db.version(1)`)
- [X] T008 Create the `TaskRepository` interface + class skeleton (methods stubbed) in `apps/web/src/data/taskRepository.ts` per contracts/data-access.md (depends on T006, T007)
- [X] T009 [P] App shell + root render + service-worker registration in `apps/web/src/main.tsx` and `apps/web/src/App.tsx`

**Checkpoint**: Foundation ready — user-story implementation can begin

---

## Phase 3: User Story 1 - Create a task and see it in the list (Priority: P1) 🎯 MVP

**Goal**: The user can create a task (name + date) and see it persisted in an
ordered list (outstanding first by date asc, completed below).

**Independent Test**: Create a task with a name and date (incl. with the network
off) and confirm it appears immediately, correctly ordered, and survives a reload.

### Tests for User Story 1 (write FIRST, ensure they FAIL) ⚠️

- [X] T010 [P] [US1] Failing unit test for the ordering function (outstanding-first by `taskDate` asc, completed below, `createdAt` tiebreak — FR-005) in `apps/web/src/domain/ordering.test.ts`
- [X] T011 [P] [US1] Failing unit test for creation validation (blank/whitespace name rejected — FR-002; missing date rejected — FR-003) in `apps/web/src/domain/task.test.ts`
- [X] T012 [P] [US1] Failing Playwright e2e: create a task → appears immediately (also with network offline — SC-002) and ordering holds, in `apps/web/tests/e2e/create-and-list.spec.ts`

### Implementation for User Story 1

- [X] T013 [US1] Implement the pure ordering function `sortTasks()` in `apps/web/src/domain/ordering.ts` (makes T010 pass)
- [X] T014 [US1] Implement `createTask()` (client UUID, `completedAt=null`, `createdAt=now`, Zod validation) and `observeTasks()` (live query + `sortTasks`) in `apps/web/src/data/taskRepository.ts` (makes T011 pass; depends on T008, T013)
- [X] T015 [P] [US1] Build `CreateTaskForm` (name + date inputs, required-field messages — FR-002/FR-003) in `apps/web/src/components/CreateTaskForm.tsx`
- [X] T016 [P] [US1] Build `TaskList` using `useLiveQuery(observeTasks)` rendering each task's name, date, and completion state in order (FR-005) in `apps/web/src/components/TaskList.tsx`
- [X] T017 [US1] Compose `TasksPage` wiring the form + list in `apps/web/src/pages/TasksPage.tsx` (depends on T014, T015, T016)

**Checkpoint**: US1 fully functional — create + list works and persists. MVP shippable.

---

## Phase 4: User Story 2 - Mark a task as done (Priority: P2)

**Goal**: The user can mark a task done (recording the completion date) and
revert it to outstanding, with done tasks visibly distinguished.

**Independent Test**: With a task present, mark it done → it moves to the
completed group with a recorded date; revert → it returns to outstanding with the
date cleared; both survive a reload.

> Note: US2 builds on US1's list to *see* completion state, so it is layered on
> top of US1 rather than fully independent — expected for this small feature.

### Tests for User Story 2 (write FIRST, ensure they FAIL) ⚠️

- [X] T018 [P] [US2] Failing unit test for completion transitions: `markDone` sets `completedAt=today` and is idempotent (FR-007, FR-008); `revert` clears `completedAt` (FR-010), in `apps/web/src/domain/completion.test.ts`
- [X] T019 [P] [US2] Failing Playwright e2e: mark done → moves to completed group (FR-009); revert → returns to outstanding; state persists after reload (SC-005), in `apps/web/tests/e2e/complete-and-revert.spec.ts`

### Implementation for User Story 2

- [X] T020 [US2] Implement pure completion-transition helpers (`markDone`, `revert` on a `Task`, idempotent) in `apps/web/src/domain/completion.ts` (makes T018 pass)
- [X] T021 [US2] Implement `markDone()` + `revert()` in `apps/web/src/data/taskRepository.ts` using the transition helpers (depends on T020, T014)
- [X] T022 [US2] Add done + revert controls and completed-vs-outstanding styling to `apps/web/src/components/TaskList.tsx` (FR-009; depends on T016)

**Checkpoint**: US1 + US2 both work; full create → list → done → revert loop complete.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Finishing touches across stories

- [X] T023 [P] Add an empty-list state ("No tasks yet") to `apps/web/src/components/TaskList.tsx`
- [X] T024 [P] Add SPDX/AGPL copyright headers to source files and a visible "Source" link satisfying AGPL §13 (e.g. `apps/web/src/components/Footer.tsx`)
- [X] T025 [P] Add Cloudflare Pages SPA config (`apps/web/public/_redirects` with SPA fallback) and document build output dir
- [X] T026 Run quickstart.md end-to-end validation (all 5 verification steps) and confirm Vitest + Playwright suites pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on Foundational and on US1's repository/list (`taskRepository.ts`, `TaskList.tsx`)
- **Polish (Phase 5)**: depends on the user stories it touches

### Within Each User Story

- Domain-logic tests (T010, T011, T018) MUST be written and FAIL before their implementation (Principle IV)
- Domain pure functions before repository methods that use them (T013 → T014; T020 → T021)
- Repository before UI that consumes it (T014 → T016/T017)

### Parallel Opportunities

- Setup: T003, T004, T005 in parallel (different config files)
- Foundational: T006 and T009 in parallel; T007 then T008
- US1 tests: T010, T011, T012 in parallel (different files)
- US1 UI: T015 and T016 in parallel (different components)
- US2 tests: T018, T019 in parallel
- Polish: T023, T024, T025 in parallel

---

## Parallel Example: User Story 1

```bash
# Write all US1 tests first (they must fail):
Task: "Ordering unit test in apps/web/src/domain/ordering.test.ts"
Task: "Creation-validation unit test in apps/web/src/domain/task.test.ts"
Task: "Create-and-list e2e in apps/web/tests/e2e/create-and-list.spec.ts"

# Then build the two components in parallel:
Task: "CreateTaskForm in apps/web/src/components/CreateTaskForm.tsx"
Task: "TaskList in apps/web/src/components/TaskList.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup → 2. Phase 2: Foundational → 3. Phase 3: US1
4. **STOP and VALIDATE**: create a task, reload, confirm it persists and is ordered
5. Deploy to Cloudflare Pages if ready — this is a usable MVP (capture tasks)

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → test → deploy (MVP: create + list)
3. US2 → test → deploy (adds mark-done + revert)
4. Polish → final validation

---

## Notes

- [P] = different files, no dependency on incomplete tasks
- Verify the three domain-logic tests FAIL before implementing (Principle IV)
- No backend/sync/owner-id tasks — deferred to a future phase per Constitution v3.0.0
- Commit after each task or logical group
- Total: 26 tasks (Setup 5, Foundational 4, US1 8, US2 5, Polish 4)
