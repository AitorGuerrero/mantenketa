# Implementation Plan: Urgency Margin (time-based urgency)

**Branch**: `015-urgency-margin` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-urgency-margin/spec.md`

## Summary

Replace the stored `urgent: boolean` (feature 007) with an optional integer
**`urgencyMargin`** (days, ≥0; `null` ⇒ never urgent). Urgency becomes
**derived, not stored**: a task is urgent when `daysBetween(reference, today) >=
margin`, where the reference date is `taskDate` if set, otherwise the task's
local **creation day**. So a dateless task with margin 1 turns urgent tomorrow;
margin 0 means "urgente ya mismo" (dateless) or "urgent at the due date" (dated).

Technical approach: a pure `isUrgent(task, today)` in a new test-first
`domain/urgency.ts` (urgency is derived/overdue-like logic → Principle IV).
`groupTasks` computes urgency once per task (like `isOverdue`) and exposes it on
`TaskInGroup`; `orderYa` floats urgent-first using the computed value instead of
`task.urgent`. The field is threaded through the domain type, Zod input,
`applyEdit`, the Dexie schema (v9, backfill `urgent → 0|null`, drop `urgent`),
the Supabase migration (`urgency_margin int`, backfill, drop `urgent`), the
sync mapping/outbox, and the form (the "Urgente" toggle gains a "días tras la
fecha/creación" field). No new entity, no new visibility surface.

See [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/urgency.md](./contracts/urgency.md), [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8

**Primary Dependencies**: Dexie (IndexedDB), @supabase/supabase-js (sync/RLS/Realtime), Zod v4

**Storage**: IndexedDB (Dexie v9) as read/write source of truth; Supabase Postgres (`tasks.urgency_margin int`, `urgent` dropped) for sync

**Testing**: Vitest (test-first `urgency.ts`; updated `grouping`, `task`, `edit`); Playwright (margin set/elapse, marker, ya-ordering); existing RLS suite unaffected

**Target Platform**: Installable PWA on Cloudflare Pages; mobile-first

**Project Type**: Web app (single `apps/web` package)

**Performance Goals**: Urgency reflected locally within 1 s of opening/render; group changes visible to members within 5 s via Realtime

**Constraints**: Offline-capable (urgency computed locally from stored margin + device date, no network); no ownership/scope mutation; free tier

**Scale/Scope**: Single household; one column swap + one pure function + one sort key + form control

## Constitution Check (v4.1.0)

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | How |
|---|-----------|--------|-----|
| I | Local-First | ✅ | Margin stored/readable locally; urgency computed locally from margin + device date (updates as the date advances, offline). Setting it is a local write queued via the outbox. Offline Behavior section complete. |
| II | One Language/Types | ✅ | `urgencyMargin` defined once on Task + Zod; `urgent` removed everywhere; SQL in one migration; row types regenerated and mapped at the single `mapping.ts` boundary. |
| III | Spec Before Code | ✅ | spec.md + this plan.md merge before code. |
| IV | Test-First Domain | ✅ | `isUrgent`/urgency-date is derived/overdue-like state logic → failing-first unit tests in `domain/urgency.test.ts`; `orderYa` urgent-first and `parseNewTask`/`applyEdit` margin tests updated test-first. RLS unchanged. |
| V | Cheap | ✅ | One column swap; no new service or dependency. |
| VI | Single Env | ✅ | One migration to the single Supabase project; PR preview deploys only. |
| VII | Simplicity | ✅ | A field + one pure function + one sort key + a form control; reuses `daysBetween`. No new abstraction, component, or module beyond `urgency.ts`. |
| VIII | Tenant-Ready | ✅ | Column on `tasks` under the existing owner/nucleus RLS; `immutable_ownership` untouched; no new isolation surface. |
| IX | Mobile-First | ✅ | Margin control added to the existing mobile-first form; marker (unchanged from 007) verified at a narrow viewport. |

**Result**: PASS — no violations; Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/015-urgency-margin/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── urgency.md       # Phase 1 output (the isUrgent contract)
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks output (later)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── urgency.ts          # NEW pure: isUrgent(task, today) via daysBetween(reference, today) >= margin
│   │   ├── urgency.test.ts     # NEW test-first: dated/dateless, margin 0/N/null, boundary, future
│   │   ├── date.ts             # + localDay(iso) helper (local YYYY-MM-DD of a timestamp)
│   │   ├── task.ts             # urgent → urgencyMargin (Task + NewTaskInput + Zod + interface)
│   │   ├── task.test.ts        # parseNewTask: margin default null, ≥0 int, empty ⇒ null
│   │   ├── grouping.ts         # TaskInGroup.isUrgent; groupTasks computes it; orderYa uses it
│   │   ├── grouping.test.ts    # urgent-first now driven by computed urgency relative to today
│   │   ├── edit.ts             # applyEdit: urgent → urgencyMargin
│   │   └── edit.test.ts        # applyEdit sets/clears margin
│   ├── data/
│   │   ├── db.ts               # Dexie v9: backfill urgencyMargin = urgent ? 0 : null; delete urgent
│   │   ├── database.types.ts   # regenerated (urgency_margin; urgent gone)
│   │   ├── taskRepository.ts   # createTask stores urgencyMargin
│   │   └── sync/
│   │       ├── mapping.ts      # taskToRow/rowToTask: urgency_margin ↔ urgencyMargin
│   │       └── syncEngine.ts   # UPDATE payload carries urgency_margin (drop urgent)
│   ├── components/
│   │   ├── taskFormInitial.ts  # urgent:boolean → urgencyMargin:number|null
│   │   ├── TaskForm.tsx        # "Urgente" toggle + "días tras la fecha/creación" field → urgencyMargin
│   │   ├── TaskItem.tsx        # marker from group.isUrgent (was task.urgent)
│   │   ├── TaskCard.tsx        # marker/tint from computed urgency
│   │   └── TaskDeck.tsx        # peek marker from computed urgency
│   └── index.css               # margin field styling (marker styles reused from 007)
├── tests/e2e/
│   └── urgency-margin.spec.ts  # rename/replace urgent-tasks.spec.ts: set margin, elapse, marker, ya-order, no-margin never urgent
└── supabase/migrations/
    └── 20260627120000_task_urgency_margin.sql  # add urgency_margin int + check; backfill from urgent; drop urgent
```

**Structure Decision**: Existing single-package web app. The change is an
additive-then-subtractive column swap threaded through the established layers,
plus one new pure module `domain/urgency.ts` (test-first) and a `localDay`
helper in `domain/date.ts`. Urgency is surfaced on `TaskInGroup.isUrgent`
exactly like the existing `isOverdue`, so components stop reading a stored flag.
No new component or abstraction (Principle VII).

## Complexity Tracking

No constitution violations — section intentionally empty.
