# Phase 0 Research: Task Comments

**Feature**: 017-task-comments · 2026-06-28

Decisions below; no open NEEDS CLARIFICATION (the scope forks were settled with the user).

## D1 — Comments are a separate, synced entity (not embedded, not cached-in-meta)

- **Decision**: New `comments` table synced like **tasks** (Dexie table + outbox + pull +
  Realtime + per-row LWW).
- **Rationale**: (a) Spec requires **offline** add/edit/delete (Principle I) — the projects
  pattern (cached in `meta`, direct online-only Supabase calls) cannot do offline writes. (b)
  **Concurrent** comments by different members on a group task must all survive — embedding a
  comments array in the task row would make the existing whole-row task LWW drop one member's
  comment. Independent comment rows avoid both problems.
- **Alternatives**: projects "cached-in-meta" (rejected: online-only); comments embedded in
  `tasks.comments` jsonb (rejected: concurrent loss under whole-row LWW).

## D2 — Generalize the single outbox to carry kind + op

- **Decision**: `OutboxEntry` becomes `{ seq, kind: 'task' | 'comment', entityId, op?: 'delete' }`.
  Dexie migration rewrites existing `{ taskId }` rows to `{ kind:'task', entityId: taskId }`.
  `flushOutbox` dispatches by `kind`; an `op:'delete'` entry issues a row delete instead of
  upsert. The **task path is behaviourally unchanged** (kind `'task'`, no op = today's logic).
- **Rationale**: Two real entities now need the same queued-push machinery (Principle VII: a
  shared mechanism with two call sites, not a speculative abstraction). One retry/flush loop to
  reason about.
- **Alternatives**: a second parallel `commentOutbox` + duplicated `flushComments` (rejected:
  duplicates the subtle retry/permission-error logic).

## D3 — Delete propagation for comments

- **Decision**: Deleting a comment removes it locally immediately and enqueues an outbox
  `op:'delete'` for that id; flush calls `supabase.from('comments').delete().eq('id', …)`;
  other devices drop it on the Realtime `DELETE` event.
- **Rationale**: Spec FR-006 requires deletions to propagate. Tasks today do **not** propagate
  deletes (no tombstones), so this is new behaviour scoped to comments. A hard delete + Realtime
  DELETE is sufficient (no tombstone table needed) because the delete travels through the outbox
  while the author is the only deleter (RLS author-only).
- **Note**: anonymous/local comments (no author/owner) never enqueue; their delete is purely local.

## D4 — Ownership = author; author-only edit/delete

- **Decision**: `comments.owner_id` **is the author** (the member who wrote it). RLS:
  `select`/`insert` = owner-or-nucleus (like tasks/projects); **`update`/`delete` = `owner_id =
  auth.uid()` only** (author-only, stricter than tasks). A LWW guard trigger (like `tasks_guard`)
  keeps `owner_id`/`task_id` immutable and enforces `updated_at` monotonicity.
- **Rationale**: Spec FR-004 — only the author edits/deletes; everyone in the nucleus can read
  and add. Principle VIII — owner from first migration; isolation in the data layer.

## D5 — Denormalize task_id + nucleus_id + series_id on the comment

- **Decision**: `comments` stores `task_id` (the instance it belongs to), `nucleus_id` (the
  task's scope, null for personal — for RLS), and `series_id` (the task's series, null if
  non-recurring — for grouping earlier instances without a join). The instance **date** for the
  "grouped by instance" headers is resolved locally from the task (`taskId → task.taskDate`).
- **Rationale**: lets the client fetch a whole series' comments by `series_id` and group them;
  keeps RLS self-contained on the comment row (no subquery to tasks).

## D6 — Pure `groupSeriesComments` for the recurring view (test-first)

- **Decision**: `groupSeriesComments(comments, taskDateById, currentTaskId)` →
  `{ current: Comment[], earlier: { taskId, date, comments: Comment[] }[] }`. Current instance's
  comments first (oldest→newest); earlier groups one per earlier instance that has comments,
  ordered most-recent-instance-first, each carrying its date. Pure, deterministic.
- **Rationale**: presentation logic with clear rules → unit-tested before UI (Principle IV
  spirit; matches the codebase's pure-domain style).

## D7 — UI: shared component, accordion state, swipe-safe

- **Decision**: One `CommentThread` (list + composer) used on the card back and in the expanded
  list row. **Accordion state** (single open id) lives in `TaskGroups` (covers all three groups,
  so only one row is open app-wide). The list row gains `onClick` to toggle expand; this is safe
  because `useSwipeAction` leaves a tap **undecided** (no movement ⇒ no swipe fires), and button
  clicks already `stopPropagation`/are excluded. Description + recurrence/edit actions move
  **behind** the expand (FR-010) in the list; on the card they stay on front/back as today with
  comments appended after the description on the back.
- **Rationale**: matches the explored swipe disambiguation (`decided:false` on tap) and the
  existing component seams; one component avoids divergence between surfaces.

## D8 — Edited indicator + ordering + count

- **Decision**: "(editado)" shown when `updatedAt > createdAt`. Comments oldest-first within an
  instance. A small comment **count** on the collapsed row / card front (FR-013) aids discovery.

## Unchanged

Tasks, their sync, and existing RLS are untouched except the outbox shape (migrated, task
behaviour identical). No backend service added; Realtime gains a second table subscription.
