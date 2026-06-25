# Implementation Plan: Swipe-to-complete in the task list

**Branch**: `011-swipe-list-complete` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

## Summary

Bring the deck's "swipe right = done" flick to pending **list rows** on touch
devices. The deck (feature 004) already owns the gesture decision in the pure
`domain/deck.ts#swipeOutcome`; this feature reuses it — only the `done`
(rightward) outcome acts, left/short snaps back. A small `useSwipeComplete` hook
encapsulates the pointer plumbing (drag tracking, scroll-vs-swipe direction
detection, fly-out + reduced-motion fallback) and `TaskItem` wires it onto its
`<li>` when the row is **pending** and the primary pointer is **coarse**. No
backend, domain-model or data change: completion is the existing
`taskRepository.markDone`.

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
- **IX. Mobile-First UI** — PASS. Gesture is enabled only on coarse pointers and verified at a mobile viewport; the checkbox remains the accessible, gesture-free path.

**Result**: PASS — no violations.

## Project Structure

```text
apps/web/
├── src/
│   ├── components/
│   │   ├── useSwipeComplete.ts   # NEW hook: pointer plumbing, scroll-vs-swipe, fly-out; reuses swipeOutcome
│   │   ├── TaskItem.tsx          # wire swipe onto the <li> for pending rows on coarse pointer
│   │   └── useCoarsePointer.ts   # reused: gates swipe to touch
│   ├── domain/
│   │   └── deck.ts               # reused unchanged: swipeOutcome (only 'done' acts here)
│   └── index.css                 # row swipe styles (transform/settle/fly, touch-action: pan-y)
└── tests/
    └── e2e/
        └── swipe-list.spec.ts    # NEW: right-swipe completes; short/left no-op; pronto row; desktop unaffected
```

**Structure Decision**: Existing single-package web app. The gesture lives in a
reusable hook rather than being duplicated from `TaskCard`; `TaskCard` is left
untouched to avoid regressing the deck. Completion reuses
`taskRepository.markDone`.

## Complexity Tracking

No constitution violations — section intentionally empty.
