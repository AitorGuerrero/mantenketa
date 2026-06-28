# Quickstart: Task Comments

**Feature**: 017-task-comments · 2026-06-28

## What the user gets

Write notes on a task. Each comment shows **who** and **when**; you can **edit/delete your own**.
On **group** tasks everyone in the group sees them (synced); on **personal** tasks only you.
Works **offline** (queued). For **recurring** tasks you see the current instance's comments first,
then earlier instances' comments **grouped by date** (dimmed, read-only).

- **Card (phone)**: flip to the back — comments are after the description and scroll within the card.
- **List**: tap a task to open it (description + actions + comments); only one opens at a time;
  swiping still completes/reverts the row.

## Try it

1. Create a task; in the list, **tap** it → it expands; add a comment → it appears with your name + time.
2. Tap another task → the first collapses (accordion). **Swipe** a row → it still completes.
3. Edit your comment → shows "(editado)"; delete it → it disappears.
4. On a phone/card, flip the card → comments are below the description and scroll.
5. Group task: comment on device A → appears for member B within a few seconds; B can add but not
   edit/delete A's comment.
6. Recurring task: complete it a couple of times leaving comments each cycle → the current instance
   shows first, earlier ones grouped by their dates, dimmed.
7. Airplane mode: add/edit/delete a comment → it works locally and syncs when back online.

## Verify

- A non-member never sees a group task's comments (RLS).
- Concurrent comments by two members both survive (no whole-row overwrite).
- A deleted comment disappears on the other device.
- Tapping a row never completes it; swiping never just expands it.

## Test commands

```bash
pnpm --filter @mantenketa/web test       # Vitest: comment.test, commentThread.test, commentReconcile.test (test-first)
pnpm --filter @mantenketa/web test:rls   # rls-comments.test.ts (isolation, author-only edit/delete)
pnpm --filter @mantenketa/web test:e2e   # comments.spec.ts (card back + list accordion + swipe)
```

## Key files

- `src/domain/comment.ts`, `commentThread.ts` (pure, test-first)
- `src/data/commentRepository.ts`, `src/data/sync/{mapping,commentReconcile,syncEngine}.ts`
- `src/data/db.ts` (comments table + generalized outbox), `supabase/migrations/20260628120000_task_comments.sql`
- `src/components/CommentThread.tsx`, `TaskItem.tsx`, `TaskGroups.tsx`, `TaskCard.tsx`
