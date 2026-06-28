# Contract: Task Comments

**Feature**: 017-task-comments · 2026-06-28

Internal contracts (pure functions, sync ops, RLS, UI). The external surface is the new
`comments` table behind RLS.

## Pure: `validateCommentText(input) → string`
Trims; throws `ValidationError` if empty/whitespace (FR-001). Otherwise returns the trimmed body.

## Pure: `isEdited(comment) → boolean`
`comment.updatedAt > comment.createdAt`.

## Pure: `groupSeriesComments(comments, taskDateById, currentTaskId)`

| comments | currentTaskId | → current / earlier |
|---|---|---|
| [] | T | [] / [] |
| 2 on T | T | 2 (oldest→newest) / [] |
| 2 on T, 3 on older T-1, 1 on older T-2 | T | 2 / [ {T-1,date,3}, {T-2,date,1} ] (most-recent earlier first) |
| 1 on an earlier instance with none on current | T | [] / [ {that instance} ] |
| earlier instance with 0 comments | T | not present in `earlier` |

Invariants: `current` only `currentTaskId`; `earlier` excludes current and empty instances; each
earlier group carries its instance date for the heading.

## Pure: `reconcileComment(local, remote) → Comment`
Greater `updatedAt` wins (local kept if `local.updatedAt >= remote.updatedAt`). Used by pull +
Realtime. Delete is handled out-of-band (Realtime DELETE / outbox delete op), not here.

## Data ops (`commentRepository`)
- `addComment(taskId, body)`: validate; build `{id, taskId, seriesId, authorId=getCurrentUserId(), nucleusId, body, createdAt=updatedAt=now}` from the task's scope; `db.comments.add` + enqueue `{kind:'comment', entityId:id}` (skip enqueue if authorId null); `scheduleFlush()`.
- `editComment(id, body)`: author-only (guard locally too); validate; `updatedAt=now`; put + enqueue.
- `deleteComment(id)`: author-only; `db.comments.delete(id)` + enqueue `{kind:'comment', entityId:id, op:'delete'}`.
- `observeCommentsForTask(taskId)` / `observeSeriesComments(seriesId)`: liveQuery from Dexie.

## Outbox dispatch (`syncEngine.flushOutbox`)
| entry | action |
|---|---|
| `{kind:'task', entityId}` | today's task upsert (unchanged) |
| `{kind:'comment', entityId}` | `comments` update-then-insert (LWW); 42501 ⇒ discard |
| `{kind:'comment', entityId, op:'delete'}` | `comments.delete().eq('id')`; missing ⇒ discard |

## RLS truth table (`comments`)
| actor vs comment | select | insert | update/delete |
|---|---|---|---|
| author (owner) | ✅ | ✅ (own owner_id) | ✅ |
| nucleus member (not author) | ✅ | ✅ (own comment on that task) | ❌ |
| outsider | ❌ (0 rows) | ❌ (42501) | ❌ |
| personal task, non-owner | ❌ | ❌ | ❌ |

## UI contract
- **CommentThread**: composer (add); for each own comment show edit + delete and "(editado)" when edited; others' comments read-only with author name + date ("tú" for self). Earlier-instance groups: dimmed, read-only, headed by instance date.
- **Card back**: appears after the description; the back scrolls (contains overflow).
- **List**: hidden until the row is clicked; clicking opens the row (description + actions + thread) and closes any other open row; swipe-to-complete still fires on tap-free horizontal drags; tapping a row does not complete it.
