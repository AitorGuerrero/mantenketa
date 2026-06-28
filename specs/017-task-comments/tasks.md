---
description: "Task list for feature 017 — task comments"
---
# Tasks: Task Comments

**Input**: design docs in `/specs/017-task-comments/` (plan, spec, research, data-model, contracts/comments.md, quickstart)

**Tests**: Principle IV — failing-first unit tests for `validateCommentText`/`isEdited`,
`groupSeriesComments`, and the comment **LWW reconcile** (sync conflict). Principle VIII —
RLS isolation suite for `comments`. UI flows via Playwright.

**Format**: `[ID] [P?] [Story?] Description (file path)` · [P] = parallelizable (different files, no incomplete deps)

---

## Phase 1: Foundational — backend, entity & sync infra (BLOCKS all stories)

**Purpose**: New synced `comments` entity + generalized outbox + pull/Realtime, with the task
sync path behaviourally unchanged. Validate `pnpm test` + sync round-trip before UI.

- [ ] T001 Migration `supabase/migrations/20260628120000_task_comments.sql`: `comments` table (id, task_id fk→tasks on delete cascade, series_id, owner_id fk→profiles, nucleus_id fk→nuclei, body check non-empty, created_at, updated_at); RLS — `select`/`insert` owner-or-nucleus (via `my_nucleus_ids()`), **`update`/`delete` author-only** (`owner_id = auth.uid()`); LWW + immutable owner/task guard (mirror `tasks_guard`); add to Realtime publication. Apply with `supabase db push`
- [ ] T002 [P] Regenerate `apps/web/src/data/database.types.ts` (comments Row/Insert/Update)
- [ ] T003 [P] `apps/web/src/domain/comment.ts` (NEW): `Comment` type + Zod + `validateCommentText` (trim, non-empty) + `isEdited(updatedAt>createdAt)`
- [ ] T004 [P] Failing-first unit tests: `apps/web/src/domain/comment.test.ts` (validate/isEdited), `apps/web/src/domain/commentThread.test.ts` (groupSeriesComments per contracts truth table), `apps/web/src/data/sync/commentReconcile.test.ts` (greater updatedAt wins)
- [ ] T005 `apps/web/src/domain/commentThread.ts` (NEW) `groupSeriesComments` + `apps/web/src/data/sync/commentReconcile.ts` (NEW) `reconcileComment` — make T004 pass
- [ ] T006 Dexie v10 in `apps/web/src/data/db.ts`: add `comments` store (`id, taskId, seriesId, nucleusId, updatedAt`); generalize `OutboxEntry` → `{ seq?, kind:'task'|'comment', entityId, op?:'delete', enqueuedAt }` (store `++seq, entityId`); upgrade migrates existing `{taskId}` → `{kind:'task', entityId}`; update `enqueuePush` in `apps/web/src/data/taskRepository.ts` to the new shape (task behaviour identical)
- [ ] T007 `apps/web/src/data/sync/mapping.ts`: add `commentToRow`/`rowToComment` (snake↔camel, normalize timestamps)
- [ ] T008 `apps/web/src/data/sync/syncEngine.ts`: `flushOutbox` dispatch by `kind` (task path unchanged; `comment` update-then-insert; `op:'delete'` deletes by id; 42501 discards); `pullComments()` (reconcile + delete locals absent remotely & not pending) run with `pullAll`; second Realtime channel `table:'comments'` (INSERT/UPDATE→reconcile, DELETE→`db.comments.delete`)
- [ ] T009 `apps/web/src/data/commentRepository.ts` (NEW): `addComment(taskId, body)` (author=`getCurrentUserId()`, scope/series from the task; Dexie add + enqueue `{kind:'comment',entityId}` in one tx, skip enqueue if author null; `scheduleFlush()`); `observeCommentsForTask(taskId)` + `observeSeriesComments(seriesId)` (liveQuery)

**Checkpoint**: comments persist locally, sync to/from server, reconcile by LWW; tasks unaffected.

---

## Phase 2: User Story 1 — comment on a task & read its comments (Priority: P1) 🎯 MVP

**Goal**: Add a comment and see it (author + date) on the card back (scroll) and via clicking a
list row (accordion, one open at a time), with swipe-to-complete still working.

**Independent Test**: add two comments; see them on the card back (scrollable) and on tapping the
row; tap another row → first collapses; swipe a row → still completes.

- [ ] T010 [US1] `apps/web/src/components/CommentThread.tsx` (NEW): composer (add via `addComment`, reject empty) + current-instance list (author via `memberName`/“tú”, date); empty state "Sin comentarios"
- [ ] T011 [US1] `apps/web/src/components/TaskCard.tsx`: render `<CommentThread>` on the back **after** the description; make the back face scroll from top (justify-content flex-start + overflow-y auto) in `apps/web/src/index.css`
- [ ] T012 [US1] List accordion: `apps/web/src/components/TaskGroups.tsx` owns one `expandedId` across all groups; `apps/web/src/components/TaskItem.tsx` adds row `onClick` toggle, renders description + action buttons + `<CommentThread>` only when expanded, shows a comment **count** badge when collapsed; keep swipe working (tap stays "undecided") and `stopPropagation` on inner buttons; styles in `apps/web/src/index.css`
- [ ] T013 [US1] Playwright `apps/web/tests/e2e/comments.spec.ts` (NEW): add + read via list tap-expand and card back; accordion single-open; swiping a row still completes; tapping never completes

**Checkpoint**: adding/reading comments works on both surfaces (non-recurring).

---

## Phase 3: User Story 2 — edit or delete your own comments (Priority: P2)

**Goal**: Author edits (shows "(editado)") or deletes own comments; others' are read-only; delete
propagates.

- [ ] T014 [US2] `apps/web/src/data/commentRepository.ts`: `editComment(id, body)` (author-only guard, validate, updatedAt=now, put + enqueue) and `deleteComment(id)` (local delete + enqueue `{kind:'comment',entityId,op:'delete'}`)
- [ ] T015 [US2] `apps/web/src/components/CommentThread.tsx`: for own comments show edit + delete affordances and "(editado)" when edited; no edit/delete on others' comments; styles in `apps/web/src/index.css`
- [ ] T016 [US2] Extend `apps/web/tests/e2e/comments.spec.ts`: edit shows "(editado)"; delete removes it; a comment by someone else offers no edit/delete

**Checkpoint**: US1 + US2 both work independently.

---

## Phase 4: User Story 3 — recurring task: earlier instances' comments (Priority: P3)

**Goal**: Current instance's comments first, then earlier instances grouped by date, dimmed,
read-only; only the current instance accepts new comments.

**Independent Test**: a series with commented earlier instances shows current first, then one
dimmed dated group per earlier instance; earlier groups have no composer.

- [ ] T017 [US3] `apps/web/src/components/CommentThread.tsx`: when the task has a `seriesId`, use `observeSeriesComments` + `groupSeriesComments` (instance dates from tasks) to render current then dimmed earlier groups headed by each instance's date; composer only on current; `apps/web/src/components/TaskDeck.tsx`/`TaskItem.tsx` pass the series context
- [ ] T018 [US3] Dimmed earlier-group + date-header styles in `apps/web/src/index.css`
- [ ] T019 [US3] Extend `apps/web/tests/e2e/comments.spec.ts`: recurring task shows current-first then dated earlier groups; earlier groups are read-only

**Checkpoint**: all three stories independently functional.

---

## Phase 5: Polish & validation

- [ ] T020 RLS isolation tests `apps/web/tests/integration/rls-comments.test.ts` (NEW): personal (owner sees, other 0 rows); group (members see, outsider 0 rows); insert WITH CHECK forging another owner → 42501; **author-only** update/delete (non-author update affects 0 rows / delete forbidden)
- [ ] T021 Full validation: `pnpm --filter @mantenketa/web test` (test-first green), lint, `tsc -b` (+worker), build, `test:e2e` (comments + regression of edit/recurrence/swipe), `test:rls`; confirm migration applied; regression check features 003–016 (list/deck render, swipe-complete, edit-in-place, recurrence actions) unaffected

---

## Dependencies & Execution Order

- **Phase 1 (Foundational)** blocks everything. T001→T002; T003/T004 [P]; T004→T005; T006 (Dexie+outbox+taskRepository enqueue) and T008 (syncEngine dispatch) **land together** so task sync never breaks; T007 before T008; T009 after T006/T007.
- **US1 (P1)** depends on Phase 1. T010 → T011/T012 (different surfaces, can parallelize) → T013.
- **US2 (P2)** depends on US1 (CommentThread exists) + T008 (delete op). T014 → T015 → T016.
- **US3 (P3)** depends on US1 + T005 (`groupSeriesComments`) + T009 (`observeSeriesComments`). T017 → T018 → T019.
- **Polish** after desired stories; T020 after T001.

### Within each story
Test-first: T004 fails before T005. UI e2e after the components exist.

### Parallel opportunities
- T002 ∥ T003 ∥ T004. T011 ∥ T012 (card vs list). T020 can be written once T001 is applied.

---

## Implementation Strategy

- **MVP = Phase 1 + US1** (T001–T013): add/read comments, card back + list accordion. The heavy
  lift is Phase 1 (entity + outbox generalization + sync). Stop and validate (sync round-trip,
  swipe coexistence) before US2/US3.
- **Incremental**: US2 (edit/delete) → US3 (recurring history) → polish + RLS suite.

## Notes
- Architecture: comments mirror the **tasks** sync shape (offline-first); the single outbox is
  generalized (`kind`/`op`) — task behaviour stays identical and must be regression-tested.
- Deletes propagate (outbox `op:'delete'` + Realtime DELETE) — new vs tasks (which don't).
- The migration touches the **production** Supabase (single env); apply with `supabase db push`.
- Total: 21 tasks.
