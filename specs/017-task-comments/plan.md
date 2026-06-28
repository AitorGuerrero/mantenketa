# Implementation Plan: Task Comments

**Branch**: `017-task-comments` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-task-comments/spec.md`

## Summary

Add **comments** as a new first-class **synced entity** (table `comments`), scoped by
owner/nucleus with RLS exactly like tasks/projects, but with **author-only** edit/delete.
Comments are **local-first**: written to a new Dexie `comments` table and queued through a
**generalized outbox** (so offline add/edit/delete works), pulled on sync, and kept live via
a second Realtime subscription. Because comments can be **deleted** and must disappear
everywhere, the outbox grows a delete op and a `kind` discriminator (tasks behave exactly as
before). A pure `groupSeriesComments` builds the recurring view (current instance first, then
earlier instances **grouped by instance date**, dimmed). A shared **Comments** UI (list +
composer) renders on the **card back** (after the description, scrollable) and in the **list**
only when a row is **clicked open** — an accordion (one open at a time) that also reveals the
description and action buttons, while **swipe-to-complete keeps working** (a tap leaves the
swipe "undecided", so adding `onClick` is safe).

See [research.md](./research.md), [data-model.md](./data-model.md),
[contracts/comments.md](./contracts/comments.md), [quickstart.md](./quickstart.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8

**Primary Dependencies**: Dexie (IndexedDB), @supabase/supabase-js (sync/RLS/Realtime), Zod v4

**Storage**: IndexedDB (Dexie, new `comments` table; generalized `outbox`) + Supabase Postgres (new `comments` table with RLS). Row types regenerated.

**Testing**: Vitest — test-first for `groupSeriesComments`, comment validation, and the comment **LWW reconcile** (Principle IV: sync conflict resolution); RLS isolation suite for `comments` (Principle VIII). Playwright for add/read on card back + list accordion + swipe coexistence.

**Target Platform**: Installable PWA, mobile-first.

**Project Type**: Web app (single `apps/web` package).

**Performance Goals**: Comment visible locally <1 s; group comment visible to other members within ~5 s via Realtime.

**Constraints**: Offline-capable (add/edit/delete queued); cross-nucleus isolation enforced in the data layer; deletes propagate; concurrent comments by different members all survive.

**Scale/Scope**: Single household; modest comment volume per task.

## Constitution Check (v4.1.0)

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Status | How |
|---|-----------|--------|-----|
| I | Local-First | ✅ | Comments in Dexie, readable offline; add/edit/delete are local writes queued via the (generalized) outbox; Realtime/pull enhance, never gate. Offline Behavior section complete. |
| II | One Language/Types | ✅ | `Comment` defined once (domain + Zod); SQL in one migration; row types regenerated and mapped at the single `mapping.ts` boundary (`commentToRow`/`rowToComment`). |
| III | Spec Before Code | ✅ | spec.md + this plan.md merge before code. |
| IV | Test-First Domain | ✅ | Failing-first unit tests for: comment **LWW reconcile** (sync conflict — explicitly required), `groupSeriesComments` (current-first + grouped-earlier), and comment text validation. |
| V | Cheap | ✅ | One table; reuses existing Supabase/Realtime; no new service or paid tier. |
| VI | Single Env | ✅ | One migration to the single Supabase project; PR preview deploys only. |
| VII | Simplicity | ✅ | Reuses the proven task sync shape; **generalizes** the single outbox (two real call sites: tasks + comments) instead of duplicating a parallel queue; shared Comments component used on both surfaces. |
| VIII | Tenant-Ready | ✅ | `comments` carries `owner_id` (=author) + `nucleus_id` from its first migration; isolation via RLS (select/insert owner-or-nucleus; **update/delete author-only**); covered by new isolation tests. |
| IX | Mobile-First | ✅ | Card-back scroll + list accordion designed for the phone first; verified at a narrow viewport. |

**Result**: PASS — no violations; Complexity Tracking not required. (The outbox generalization is a shared mechanism for two entities, not a speculative abstraction.)

## Project Structure

### Documentation (this feature)

```text
specs/017-task-comments/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── comments.md      # Phase 1 output (entity + pure fns + sync ops + UI contract)
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks output (later)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── comment.ts            # NEW Comment type + Zod + validateCommentText + isEdited
│   │   ├── comment.test.ts       # NEW test-first (validation, isEdited)
│   │   ├── commentThread.ts      # NEW pure groupSeriesComments(comments, taskById, currentId)
│   │   └── commentThread.test.ts # NEW test-first (current-first + grouped-earlier by date)
│   ├── data/
│   │   ├── db.ts                 # Dexie vN: comments table + generalized outbox (kind/op) + migrate
│   │   ├── database.types.ts     # regenerated (comments table)
│   │   ├── commentRepository.ts  # NEW add/edit/delete + observeCommentsForTask/Series (Dexie + outbox)
│   │   └── sync/
│   │       ├── mapping.ts        # + commentToRow / rowToComment
│   │       ├── commentReconcile.ts  # NEW pure LWW merge (test-first) — mirrors task applyRemote
│   │       └── syncEngine.ts     # outbox dispatch by kind/op; pullComments; comments Realtime channel
│   ├── components/
│   │   ├── CommentThread.tsx     # NEW list + composer; renders current + dimmed earlier groups
│   │   ├── TaskItem.tsx          # click-to-expand: description+actions+comments behind expand; count badge
│   │   ├── TaskGroups.tsx        # owns single-open accordion state across all groups
│   │   ├── TaskCard.tsx          # comments after description on the back (scroll)
│   │   └── TaskDeck.tsx          # pass series comments to the top card
│   └── index.css                 # accordion + card-back scroll + dimmed-earlier + composer styles
├── tests/
│   ├── integration/
│   │   └── rls-comments.test.ts  # NEW isolation: personal & group; author-only edit/delete
│   └── e2e/
│       └── comments.spec.ts      # NEW add/read on card back + list accordion + swipe coexistence
└── supabase/migrations/
    └── 20260628120000_task_comments.sql  # NEW comments table + RLS + author-only update/delete + LWW guard
```

**Structure Decision**: New synced entity mirroring the **tasks** sync shape (Dexie table +
outbox + pull + Realtime + LWW), chosen over the projects "cached-in-meta" pattern (online-only,
fails offline) and over embedding comments in the task row (whole-row LWW would drop concurrent
comments). The single outbox is generalized to `{seq, kind, entityId, op}` so one flush path
serves tasks and comments and can carry deletes; the task path is behaviourally unchanged.
Presentation logic (`groupSeriesComments`) and conflict resolution (`commentReconcile`) are pure
and test-first. One shared `CommentThread` renders on both surfaces.

## Complexity Tracking

No constitution violations — section intentionally empty.
