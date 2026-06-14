# Quickstart: Home Refactor — Grouped Task Lists & Create Button

**Feature**: 003-home-task-groups · UI refactor over the existing local store;
no backend, schema, or dependency change.

> pnpm for everything. Mobile-first (Constitution Principle IX): verify the
> layout at a narrow viewport first.

## Develop & test

```bash
pnpm install
pnpm --filter @mantenketa/web dev

pnpm --filter @mantenketa/web test       # vitest: groupTasks (test-first)
pnpm --filter @mantenketa/web test:e2e   # playwright: grouped home + create button
pnpm --filter @mantenketa/web lint
```

The new domain logic is `groupTasks(tasks, today)` in
`apps/web/src/domain/grouping.ts`, with `grouping.test.ts` written to fail first
(Principle IV).

## Verify the feature end to end

1. With no tasks: the home shows the three group headings with empty hints and a
   **"Nueva tarea"** button; no creation form is visible.
2. Tap **Nueva tarea** → the form appears. Create a task **without a date** →
   the form closes and the task appears under **Para hacer ya**.
3. Create a task dated **in the past** → appears in **Para hacer ya**,
   visually highlighted as overdue.
4. Create a task dated **today** → appears in **Para hacer ya**, NOT highlighted.
5. Create tasks dated **in the future** → appear under **Para hacer pronto**,
   soonest first; none leak into "ya".
6. Mark an overdue task done → it moves to **Hechas recientemente** at the top;
   revert it → it returns to "ya".
7. Complete 6 tasks → only the **5 most recent** show under "Hechas
   recientemente".
8. Open **Nueva tarea** and **Cancelar** → the form closes, nothing created.
9. Narrow the viewport (phone width) → the three groups stack and remain usable
   (mobile-first).

## Regression

- Feature 001/002 suites stay green: create/validation, complete/revert,
  personal vs nucleus scope, realtime sync, sign-in (`pnpm test`, `test:rls`,
  `test:e2e`).
