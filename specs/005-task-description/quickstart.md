# Quickstart: Task Description

**Feature**: 005-task-description · Adds an optional `description` to tasks.

## Apply the backend change

```bash
supabase db push                                            # applies 20260614120000_task_description.sql
supabase gen types typescript --linked > apps/web/src/data/database.types.ts
```

## Develop & test

```bash
pnpm install
pnpm --filter @mantenketa/web dev

pnpm --filter @mantenketa/web test       # vitest: parseNewTask description normalization
pnpm --filter @mantenketa/web test:e2e   # playwright: create with description, list + card, blank = none
pnpm --filter @mantenketa/web lint
```

## Verify

1. Tap **Nueva tarea**, enter a name and a **multi-line description**, save →
   the task shows its description in the list (line breaks preserved).
2. On a touch device, the same task's card shows the description (clamped if long).
3. Create a task leaving the description empty → no description shown; identical
   to a task created before this feature.
4. Reload → the description persists. Signed in on another device → it appears
   there too.

## Regression

- Features 001–004 suites stay green (`pnpm test`, `test:rls`, `test:e2e`):
  create/validation, complete/revert, grouping, overdue, deck, scope, sync.
