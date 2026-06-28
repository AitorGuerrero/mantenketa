# Phase 1 Data Model: Task Comments

**Feature**: 017-task-comments · 2026-06-28

A new synced entity `comments`, a generalized outbox, and two pure functions. Tasks unchanged
(except the outbox shape).

## Domain (`domain/comment.ts`)

```ts
Comment {
  id: string (uuid)
  taskId: string          // the task instance commented on
  seriesId: string | null // task's series (for grouping earlier instances); null if non-recurring
  authorId: string | null // = owner; null only for anonymous/local
  nucleusId: string | null// task's scope (RLS); null ⇒ personal
  body: string            // non-empty, trimmed
  createdAt: string (ISO)
  updatedAt: string (ISO) // > createdAt ⇒ edited
}
```

- Zod `CommentSchema`; `validateCommentText(s)` → trimmed non-empty or throws (FR-001).
- `isEdited(c) = c.updatedAt > c.createdAt`.

## Pure presentation (`domain/commentThread.ts`, test-first)

```ts
groupSeriesComments(
  comments: readonly Comment[],
  taskDateById: ReadonlyMap<string, string | null>,
  currentTaskId: string,
): {
  current: Comment[]                                   // currentTaskId comments, oldest→newest
  earlier: { taskId: string; date: string | null; comments: Comment[] }[] // one per earlier instance with comments, most-recent instance first
}
```

## Conflict resolution (`data/sync/commentReconcile.ts`, test-first — Principle IV)

`reconcileComment(local: Comment | undefined, remote: Comment): Comment` → keep the one with the
greater `updatedAt` (mirrors task `applyRemote`); used by `pullComments` and the Realtime handler.

## Local (Dexie, `db.ts`) — `db.version(10)`

- New table `comments: 'id, taskId, seriesId, nucleusId, updatedAt'` (indexes for per-task and
  per-series queries).
- **Generalized outbox**: `OutboxEntry = { seq?, kind: 'task'|'comment', entityId, op?: 'delete', enqueuedAt }`.
  Upgrade rewrites existing `{ taskId }` → `{ kind:'task', entityId: taskId }`. Store string stays
  `'++seq, entityId'` (drop the `taskId` index; add `entityId`).
- `commentRepository`: add/edit/delete write `db.comments` and enqueue `{kind:'comment', entityId:id[, op:'delete']}` in one transaction, then `scheduleFlush()`. Anonymous (authorId null) ⇒ no enqueue (local only).

## Postgres (migration `20260628120000_task_comments.sql`)

```sql
create table public.comments (
  id uuid primary key,
  task_id uuid not null references public.tasks (id) on delete cascade,
  series_id uuid,
  owner_id uuid not null references public.profiles (id) on delete cascade, -- = author
  nucleus_id uuid references public.nuclei (id) on delete cascade,          -- null ⇒ personal
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null,
  updated_at timestamptz not null
);
-- RLS: read/add by owner-or-nucleus; edit/delete author-only
create policy comments_select on public.comments for select to authenticated
  using (owner_id = auth.uid() or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids())));
create policy comments_insert on public.comments for insert to authenticated
  with check (owner_id = auth.uid() and (nucleus_id is null or nucleus_id in (select public.my_nucleus_ids())));
create policy comments_update on public.comments for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy comments_delete on public.comments for delete to authenticated
  using (owner_id = auth.uid());
-- LWW + immutable owner/task guard (mirror tasks_guard), updated_at monotonic
```

Row types regenerated (`comments` Row/Insert/Update). Realtime: add `comments` to the publication
if needed.

## Sync (`mapping.ts`, `syncEngine.ts`)

- `commentToRow`/`rowToComment` at the single boundary (snake_case ↔ camelCase; normalize timestamps).
- `flushOutbox`: dispatch by `kind`; `kind:'comment'` upserts via update-then-insert like tasks,
  `op:'delete'` deletes by id; permission-denied (42501) discards the entry.
- `pullComments()`: `select * from comments`, `reconcileComment` into Dexie, delete locals absent
  remotely and not pending — run alongside `pullAll`.
- Realtime: second `.on(postgres_changes, { table:'comments' })`; INSERT/UPDATE → reconcile, DELETE
  → `db.comments.delete(old.id)`.

## UI surfaces

- **`CommentThread.tsx`**: composer (add) + current list (with edit/delete for own, "(editado)")
  + dimmed earlier groups headed by each instance date (read-only). Reused on both surfaces.
- **Card back** (`TaskCard.tsx`): render `CommentThread` after the description; the back face
  scrolls (overflow-y auto; switch justify from center to flex-start so it scrolls from top).
- **List** (`TaskItem.tsx` + `TaskGroups.tsx`): row `onClick` toggles expand; when expanded show
  description + actions + `CommentThread`. `TaskGroups` holds a single `expandedId`. Collapsed row
  shows a comment **count** badge.

## Migration mapping summary

| Old outbox row | New outbox row |
|---|---|
| `{ seq, taskId, enqueuedAt }` | `{ seq, kind:'task', entityId: taskId, enqueuedAt }` |
| (new) comment add/edit | `{ seq, kind:'comment', entityId: commentId, enqueuedAt }` |
| (new) comment delete | `{ seq, kind:'comment', entityId: commentId, op:'delete', enqueuedAt }` |
