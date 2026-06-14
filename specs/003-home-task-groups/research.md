# Phase 0 Research: Home Refactor — Grouped Task Lists & Create Button

**Feature**: 003-home-task-groups · **Date**: 2026-06-13

Small, UI-centric feature. The only non-trivial decisions are how to compute the
groups (incl. the day boundary / overdue detection) and how to keep the change
test-first and simple. Evaluated under Constitution v4.1.0.

---

## Decision 1: Grouping as a single pure function (test-first)

**Decision**: Add `groupTasks(tasks, today): { ya, pronto, hechas }` in
`apps/web/src/domain/grouping.ts`, a pure function taking the task list and the
current local day (`YYYY-MM-DD`) as an argument. It partitions:
- **ya**: `completedAt === null` AND (`taskDate === null` OR `taskDate <= today`)
- **pronto**: `completedAt === null` AND `taskDate > today`
- **hechas**: `completedAt !== null`, sorted by `completedAt` desc (tiebreak
  `updatedAt` desc, then `createdAt` desc), capped at 5.

Each task carries a derived `isOverdue = taskDate !== null && taskDate < today`
(only meaningful in "ya") for the highlight.

**Rationale**: Passing `today` in (not reading the clock inside) makes the
overdue/today/future logic deterministic and unit-testable — exactly the
test-first domain logic Principle IV requires. One function, one responsibility
(Principle VII).

**Alternatives considered**:
- Computing groups inline in the component — not unit-testable, scatters the
  date logic into JSX. Rejected.
- A new Dexie index / stored "status" — violates "no schema change" and would
  need recomputation as the day rolls over. Rejected; derive at render.

## Decision 2: Date comparison via `YYYY-MM-DD` string ordering

**Decision**: Compare `taskDate` against `today` as plain string comparison.
`YYYY-MM-DD` is lexicographically ordered, so `<`, `<=`, `>` on the strings are
correct calendar-day comparisons — no `Date` parsing, no timezone pitfalls.

**Rationale**: Tasks already store dates as `YYYY-MM-DD` calendar days
(feature 001). String comparison is the simplest correct approach and matches
the existing `sortTasks` implementation.

## Decision 3: "today" from the device's local day

**Decision**: A tiny helper returns the device's local day as `YYYY-MM-DD`
(reusing the same logic already in `taskRepository.todayIsoDate()`; extract it
to a shared spot so both the repository and the home use one definition). The
home computes `today` per render of the live-query result.

**Rationale**: Calendar-day granularity, local to the device (Principle I, no
server needed). Re-evaluated on each render so a task naturally moves from
"today" to "overdue" after midnight on the next view.

## Decision 4: Reuse one TaskItem across groups; form toggle as local state

**Decision**: Extract the existing per-task rendering into a shared `TaskItem`
used by all three sections (identical checkbox/done/revert/"hecha por…"
behaviour). The "Nueva tarea" button and the form's open/closed state live as
local React state in `TasksPage`; `CreateTaskForm` gains an `onCancel` and a
Cancelar control, and closes on successful save.

**Rationale**: Avoids duplicating task rendering three times (Principle VII).
No router, no global state, no modal library — a boolean toggle is enough.

## Decision 5: Live updates & ordering within groups

**Decision**: Keep `observeTasks()` (live query) as the single source; the home
maps its emissions through `groupTasks`. Within "ya": dateless first, then by
`taskDate` asc (most overdue → today) — reuse `sortTasks` semantics. Within
"pronto": `taskDate` asc. "hechas": completion desc, capped at 5.

**Rationale**: Re-grouping on every emission gives the < 1s move-on-done/revert
behaviour (SC-004) for free, including realtime nucleus updates, with no extra
wiring.

---

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Group definitions | Pure `groupTasks(tasks, today)`; ya / pronto / hechas as above |
| Overdue detection | `taskDate < today` (string compare), highlighted in "ya" |
| Day boundary | Device local `YYYY-MM-DD`, passed into the pure function |
| "Hechas" size | Cap 5, newest completion first |
| Rendering | Shared extracted `TaskItem`; three sections; empty hints |
| Create form | Hidden by default; "Nueva tarea" toggles; closes on save/cancel |
| Persistence | None — derived at render; no schema change |

No `NEEDS CLARIFICATION` items remain.
