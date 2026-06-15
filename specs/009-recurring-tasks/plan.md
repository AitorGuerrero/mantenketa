# Implementation Plan: Recurring Tasks

**Branch**: `009-recurring-tasks` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-recurring-tasks/spec.md`

## Summary

Add recurring tasks with a simple cadence (frequency daily/weekly/monthly/yearly
+ interval "every N") and an anchor (from completion — default — or from due
date). Recurrence uses **materialize-on-completion**: completing a recurring task
leaves that instance completed and spawns exactly one pending successor with the
next computed date, carrying name, description, urgent flag, group/scope and the
recurrence, linked by a `series_id`. The successor's id is **deterministic**
(UUID v5 of `series_id` + next date) so two devices completing the same instance
converge to a single successor under last-write-wins (no duplicates). Users can
**skip** the current occurrence (advance the date in place, no completion) and
**stop** a series (clear recurrence). The next-date computation is a pure,
test-first function (Principle IV).

Technical approach: additive. Two nullable columns on `tasks` (`recurrence`
jsonb, `series_id` uuid); a new pure `domain/recurrence.ts` (next-date + cadence
label + deterministic id); the successor generation hooked into
`taskRepository.markDone`/`revert`; skip/stop as new repository operations;
recurrence controls in `CreateTaskForm`; a cadence badge in `TaskBody`; skip/stop
affordances in list + deck. RLS is unchanged — the successor INSERT already
satisfies the existing `tasks_insert` policy.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8

**Primary Dependencies**: Dexie (IndexedDB), @supabase/supabase-js (Postgres+RLS,
Auth, Realtime), Zod v4, vite-plugin-pwa; **+ `uuid` (v5)** for deterministic
successor identity

**Storage**: IndexedDB (Dexie) as read/write source of truth; Supabase Postgres
for sync/sharing (one project)

**Testing**: Vitest (unit incl. recurrence pure functions + RLS isolation),
Playwright (e2e)

**Target Platform**: Installable PWA on Cloudflare Workers; mobile-first

**Project Type**: Web app (single `apps/web` package, pnpm workspace)

**Performance Goals**: Local completion + successor creation instant (one
IndexedDB transaction); group successor visible to members within 5 s via
Realtime

**Constraints**: Offline-capable for create/complete/skip/stop; deterministic
successor id to avoid cross-device duplicates; free tier only

**Scale/Scope**: Single household; one open instance per series; tens of tasks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Local-First** — PASS. Create/complete/skip/stop are local writes; the
  successor is generated locally inside the same Dexie transaction and synced
  later. Offline Behavior section complete.
- **II. One Language, One Type System** — PASS. `Recurrence` defined once as a
  Zod schema reused everywhere; Supabase row types regenerated after the
  migration and mapped at the single `sync/mapping.ts` boundary. The `uuid`
  dependency is an external library used only for v5 at one call site.
- **III. Spec Before Code** — PASS. spec.md + this plan.md merge before code.
- **IV. Test-First for Domain Logic** — PASS. `nextOccurrenceDate` (daily/weekly/
  monthly/yearly + month-end clamp), the deterministic successor id, and the
  materialize/skip/stop state transitions get failing unit tests first
  ("recurrence calculation" and "state-transition logic" are explicitly named in
  the principle). Cross-device dedup is covered by the deterministic-id unit test.
- **V. Cheap by Default** — PASS. No new services; `uuid` is a tiny build-time
  dependency, no runtime cost tier.
- **VI. Single Deployable Environment** — PASS. One Supabase project; migration
  from main.
- **VII. Simplicity Over Framework Magic** — PASS. Materialize-on-completion
  avoids an occurrence/RRULE engine. The one new dependency (`uuid` v5) is
  justified: deterministic content-addressed identity for cross-device dedup, a
  single concept with one call site; a hand-rolled SHA-1 UUID would be more code
  and more risk.
- **VIII. Tenant-Ready Data Model** — PASS. The successor carries the same
  `owner_id` and `nucleus_id`; isolation stays in RLS; the existing
  `tasks_insert`/`tasks_select` policies already cover it. No new visibility
  surface, so existing RLS tests continue to apply.
- **IX. Mobile-First UI** — PASS. Recurrence controls, cadence badge and skip/
  stop actions designed at a narrow viewport first.

**Result**: PASS — no violations; Complexity Tracking not required (the single
new dependency is justified above under Principle VII).

## Project Structure

### Documentation (this feature)

```text
specs/009-recurring-tasks/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── recurrence.md    # Phase 1 output
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks output (later)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── recurrence.ts        # NEW pure: nextOccurrenceDate, cadenceLabel, successorId
│   │   ├── recurrence.test.ts   # NEW test-first (calc + clamp + deterministic id)
│   │   ├── task.ts              # TaskSchema gains recurrence + seriesId; NewTaskInput gains recurrence
│   │   ├── task.test.ts         # parseNewTask recurrence defaults/validation
│   │   └── completion.ts        # markDone/revert stay pure (state only); generation lives in repo
│   ├── data/
│   │   ├── db.ts                # Dexie v6: backfill recurrence=null, seriesId=null
│   │   ├── taskRepository.ts    # markDone spawns successor; revert removes it; skipOccurrence; stopRecurrence
│   │   └── sync/
│   │       ├── mapping.ts       # carry recurrence (jsonb) + series_id
│   │       └── syncEngine.ts    # UPDATE payload carries recurrence + series_id
│   ├── components/
│   │   ├── CreateTaskForm.tsx   # "Repetir" → freq + interval + anchor controls
│   │   ├── TaskItem.tsx         # cadence badge; skip / "no repetir más" actions (list)
│   │   ├── TaskCard.tsx         # cadence badge + skip/stop on the card (deck)
│   │   └── TaskDeck.tsx         # pass recurrence actions through
│   └── index.css                # badge + recurrence controls + actions (mobile-first)
├── tests/
│   └── e2e/
│       └── recurring-tasks.spec.ts   # NEW: complete→successor, anchors, skip, stop, label
supabase/migrations/
└── 20260615140000_recurring_tasks.sql  # add recurrence jsonb + series_id uuid (nullable)
```

**Structure Decision**: Existing single-package web app. The heart is a new pure
`domain/recurrence.ts` (test-first) plus successor generation wired into the
existing `taskRepository` completion path; everything else is additive columns,
mapping and UI. Internal column name `nucleus_id` retained (feature 008 decision).

## Complexity Tracking

No unjustified violations. The one new dependency (`uuid` v5) is justified under
Constitution Check / Principle VII above; no table required.
