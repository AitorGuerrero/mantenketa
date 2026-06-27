# Quickstart: Urgency Margin

**Feature**: 015-urgency-margin · 2026-06-27

## What changes for the user

Urgency is no longer a static "Urgente" flag — it now happens **over time**:

- **Dated task**: optionally say it becomes urgent **N days after its date**
  (0 = at the date). Until then it sits normally in "Para hacer ya" if overdue.
- **Dateless task**: optionally say it becomes urgent **N days after you create
  it** (0 = "urgente ya mismo", urgent right away).
- **No margin** ⇒ the task never becomes urgent on its own.

Once the margin elapses the task turns urgent by itself — marked and floated to
the top of "Para hacer ya" — with no edit needed.

## Try it

1. Create a task **with today's date** and the "Urgente" toggle on, margin `0` →
   it appears urgent immediately at the top of "Para hacer ya".
2. Create a task with a **past date** and margin `30` → it is in "Para hacer ya"
   but **not** urgent (still inside its grace period).
3. Create a **dateless** task, "Urgente" on, margin `1` → not urgent today; it
   turns urgent on its own tomorrow.
4. Create a task with the toggle **off** → never urgent, however overdue.
5. Edit an existing task to add/clear the margin → urgency recomputes.

## Verify (mobile viewport)

- Urgent tasks show the amber "Urgente" badge + tint on the card (front/back),
  peek cards, and list rows; non-urgent tasks look exactly as before.
- In "Para hacer ya", every urgent task is above every non-urgent task.
- A pre-existing task that was urgent before this change is still urgent
  (migrated to margin 0); previously non-urgent tasks are still non-urgent.

## Test commands

```bash
pnpm --filter web test       # Vitest: urgency.test.ts (test-first), grouping, task, edit
pnpm --filter web test:e2e   # Playwright: urgency-margin.spec.ts
```

## Key files

- `src/domain/urgency.ts` — `isUrgent(task, today)` (pure, test-first)
- `src/domain/date.ts` — `localDay(iso)` helper
- `src/domain/grouping.ts` — `TaskInGroup.isUrgent`, urgent-first `orderYa`
- `src/domain/task.ts`, `edit.ts` — `urgencyMargin` field
- `src/data/db.ts` (v9), `supabase/migrations/20260627120000_task_urgency_margin.sql`
- `src/components/TaskForm.tsx` — toggle + "días" field
