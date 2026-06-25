# Implementation Plan: Swipe-to-complete in the task list

**Branch**: `011-swipe-list-complete` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

## Summary

Make horizontal swipe the **only** complete/revert affordance in the task list,
**removing the row checkbox**. The deck (feature 004) already owns the gesture
decision in the pure `domain/deck.ts#swipeOutcome`; this feature reuses it. A
`useSwipeAction` hook encapsulates the pointer plumbing (drag tracking,
scroll-vs-swipe direction detection, gradual tint, fly-out + reduced-motion
fallback) and takes a per-row `SwipeAction` (direction + callback + tint colour).
`TaskItem` builds that action from row state: **pending → swipe right = done**
(green tint, `markDone`); **completed → swipe left = revert** (grey tint,
`revert`); editing → no action. The gesture works with any pointer (mouse and
touch), so desktop loses its checkbox too. No backend, domain-model or data
change: it reuses `taskRepository.markDone`/`revert`.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8
**Primary Dependencies**: Dexie (IndexedDB), Supabase (sync), React
**Storage**: IndexedDB (Dexie) source of truth; Supabase for sync
**Testing**: Vitest (the reused `swipeOutcome` is already unit-tested), Playwright (e2e gesture)
**Target Platform**: Installable PWA; mobile-first
**Project Type**: Web app (single `apps/web` package)
**Performance Goals**: Completion reflected locally within 1 s
**Constraints**: Touch-only (coarse pointer), additive to the checkbox, preserve vertical scroll, offline-capable (same write path as the checkbox)
**Scale/Scope**: One hook + `TaskItem` wiring + CSS; no new domain logic

## Constitution Check

- **I. Local-First** — PASS. Swipe calls `markDone`, the same local-first write the checkbox uses; no connectivity needed.
- **II. One Language, One Type System** — PASS. No new types; reuses `swipeOutcome`/`Task`. No SQL.
- **III. Spec Before Code** — PASS. spec.md + this plan merge before code.
- **IV. Test-First for Domain Logic** — PASS. The gesture decision is the already-tested pure `swipeOutcome`; no new domain function is introduced. The hook is UI plumbing, covered by an e2e gesture test.
- **V. Cheap by Default** — PASS. No new services or dependencies.
- **VI. Single Deployable Environment** — PASS. No migration; static app only.
- **VII. Simplicity Over Framework Magic** — PASS. One small hook reusing existing pure logic; deliberately does not refactor the working `TaskCard` (its needs — flip, defer, imperative fly — differ), keeping risk low.
- **VIII. Tenant-Ready Data Model** — PASS. No data-model or visibility change.
- **IX. Mobile-First UI** — PASS. The swipe gesture is mobile-first and verified at a mobile viewport (and with a mouse). Per the explicit "swipe replaces it" decision the checkbox is removed; the accessibility trade-off is recorded in the Accessibility note below.

**Result**: PASS — no violations.

## Project Structure

```text
apps/web/
├── src/
│   ├── components/
│   │   ├── useSwipeAction.ts     # NEW hook: takes a SwipeAction (direction/callback/tint); pointer plumbing, scroll-vs-swipe, gradual tint, fly-out; reuses swipeOutcome
│   │   └── TaskItem.tsx          # checkbox removed; builds the per-row SwipeAction (pending→right done, done→left revert) and wires it onto the <li>
│   ├── domain/
│   │   └── deck.ts               # reused unchanged: swipeOutcome ('done'=right, 'defer'=left)
│   └── index.css                 # row swipe styles (transform/settle/fly + background-color, touch-action: pan-y); .task-toggle removed
└── tests/
    ├── e2e/
    │   ├── ui.ts                 # NEW helpers: swipeRow / completeTask / revertTask / taskRow (replace checkbox clicks)
    │   ├── swipe-list.spec.ts    # NEW: right-completes, left-reverts, wrong-direction/short no-op, pronto row, mouse + touch parity
    │   └── *.spec.ts             # migrated: complete-and-revert, home-groups, recurring-tasks, edit-tasks, nucleus-tasks now swipe instead of clicking a checkbox
```

**Structure Decision**: Existing single-package web app. The gesture lives in a
reusable hook rather than being duplicated from `TaskCard`; `TaskCard` is left
untouched to avoid regressing the deck. Complete/revert reuse
`taskRepository.markDone`/`revert`.

## Accessibility note

Removing the checkbox makes the gesture the only complete/revert path, so there
is no longer a keyboard- or AT-operable control for those actions in the list
(per the explicit "swipe replaces it" decision). If that regression matters
later, the additive fix is a visually-hidden button per row — out of scope here.

## Complexity Tracking

No constitution violations — section intentionally empty.
