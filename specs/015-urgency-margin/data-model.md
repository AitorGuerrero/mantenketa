# Phase 1 Data Model: Urgency Margin

**Feature**: 015-urgency-margin · 2026-06-27

One field swap on Task: the stored boolean `urgent` becomes the nullable integer
`urgencyMargin`; urgency itself is derived, not stored.

## Domain (`task.ts`)

- Remove `Task.urgent: boolean`.
- Add `Task.urgencyMargin: number | null` — `z.number().int().min(0).nullable()`.
  `null` ⇒ never urgent; `0` ⇒ urgent at the reference date; `N` ⇒ N days after.
- `NewTaskInput.urgencyMargin?: number | null` (replaces `urgent?`).
- `NewTaskInputSchema`: preprocess `urgencyMargin` so `undefined`/`''`/`NaN` ⇒
  `null`; otherwise `z.number().int().min(0)`. (Was `urgent: z.boolean().default(false)`.)
- Name/date/scope/assignee/project/description/recurrence unchanged.

## Derived urgency (`urgency.ts`, NEW — test-first, Principle IV)

```text
reference(task)         = task.taskDate ?? localDay(task.createdAt)   // YYYY-MM-DD
isUrgent(task, today)   = task.urgencyMargin !== null
                          && daysBetween(reference(task), today) >= task.urgencyMargin
```

- Pure; `today` injected (local day). Reuses `daysBetween` (date.ts).
- A future reference yields a negative diff ⇒ not urgent.
- `localDay(iso)` (NEW in date.ts): local YYYY-MM-DD of an ISO timestamp.

## Local (Dexie, `db.ts`)

`db.version(9)` (no new index; `urgencyMargin` is not queried by index):
`upgrade()` sets `row.urgencyMargin = row.urgent ? 0 : null` and `delete
row.urgent`. createTask writes `urgencyMargin`.

## Postgres (migration `20260627120000_task_urgency_margin.sql`)

```sql
alter table public.tasks add column urgency_margin int
  check (urgency_margin is null or urgency_margin >= 0);
update public.tasks set urgency_margin = case when urgent then 0 else null end;
alter table public.tasks drop column urgent;
```

Inherits the table's existing RLS (owner/nucleus); no policy or trigger change.
Row types regenerated (`urgent` gone, `urgency_margin int | null`).

## Sync (`mapping.ts`, `syncEngine.ts`)

`taskToRow`/`rowToTask` map `urgencyMargin ↔ urgency_margin`; the outbox UPDATE
payload carries `urgency_margin` (drop `urgent`). Per-task LWW by `updatedAt`,
unchanged.

## Ordering (`grouping.ts`)

`TaskInGroup` gains `isUrgent: boolean`. `groupTasks` computes it per task with
`isUrgent(task, today)` for all three groups (ya/pronto/hechas). `orderYa`:
primary key urgent-before-non-urgent using the computed value (was `a.urgent`);
secondary keys unchanged (dateless last, dated by date asc, createdAt asc).
Applies to "Para hacer ya" only; pronto/hechas order unchanged.

## Display

Components read `group.isUrgent` (not `task.urgent`): badge + tint on card
front/back, peek cards, and list rows — visuals unchanged from feature 007. A
task with `urgencyMargin = null`, or whose margin has not yet elapsed, renders
exactly as a non-urgent task.

## Migration mapping summary

| Old `urgent` | New `urgencyMargin` | Resulting behaviour |
|---|---|---|
| `true`, dated | `0` | urgent at/after due date |
| `true`, dateless | `0` | urgent from creation (now) |
| `false` | `null` | never auto-urgent |
