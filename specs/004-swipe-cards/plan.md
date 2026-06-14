# Implementation Plan: Swipeable Cards for "Para hacer ya" (touch)

**Branch**: `004-swipe-cards` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-swipe-cards/spec.md`

## Summary

On touch-primary environments, present the feature-003 "Para hacer ya" group as a
one-card-at-a-time **deck**: swipe right (or "Hecha") completes via the existing
`markDone`; swipe left (or "Posponer") moves the task to the back of the deck for
the session only (no write, no schema change). "Pronto"/"hechas" stay as lists
below; non-touch keeps the feature-003 list view. The deck *order* is the only
new logic — a pure function over the "ya" set plus an in-memory deferred-id list
— and is unit-tested; the gesture (hand-rolled Pointer Events, no library) and
layout are UI covered by e2e in a touch-emulated context.

See [research.md](./research.md) for decisions, [data-model.md](./data-model.md)
(no schema change), and [contracts/deck.md](./contracts/deck.md) for the pure
ordering function the deck binds to.

## Technical Context

**Language/Version**: TypeScript 5.x (strict)

**Primary Dependencies**: React 18; **no new dependency** (swipe via native
Pointer Events; touch detection via `matchMedia('(pointer: coarse)')`)

**Storage**: Unchanged — IndexedDB via Dexie; deck order is in-memory session state

**Testing**: Vitest (unit — pure deck ordering, test-first), Playwright (e2e in a
coarse-pointer/touch-emulated context + a fine-pointer regression)

**Target Platform**: Installable PWA; this feature is the **mobile/touch**
experience (Principle IX)

**Project Type**: Static SPA (no backend change)

**Performance Goals**: next card appears < 1s (SC-001); 60fps drag follow

**Constraints**: fully offline (Principle I); no swipe library (Principle VII);
respect `prefers-reduced-motion`; gesture-free path always available (a11y)

**Scale/Scope**: a handful of "hacer ya" cards at a time

## Constitution Check

*(Evaluated against Constitution v4.1.0.)*

| # | Principle | Status | How this plan complies |
|---|-----------|--------|------------------------|
| I | Local-First | ✅ PASS | Deck is presentation; right-swipe = existing local `markDone`; left-swipe = in-memory reorder, no write. Fully offline. |
| II | One Language, One Type System | ✅ PASS | TypeScript only; reuses the single `Task` type; no SQL. |
| III | Spec Before Code | ✅ PASS | spec.md (16/16) + this plan precede code. |
| IV | Test-First for Domain Logic | ✅ PASS | The deck-ordering merge (`orderDeck`) and swipe-threshold decision (`swipeOutcome`) are pure → failing-first unit tests. Gesture/layout via e2e. |
| V | Cheap by Default | ✅ PASS | No new services or dependencies. |
| VI | Single Deployable Environment | ✅ PASS | No env change. |
| VII | Simplicity Over Framework Magic | ✅ PASS | No tinder/swipe/animation library; ~native Pointer Events + CSS transform. New abstractions (`TaskDeck`, `TaskCard`) have clear single use sites. |
| VIII | Tenant-Ready Data Model | ✅ PASS (N/A) | No new entity; deck consumes the already-scoped "ya" set. |
| IX | Mobile-First UI | ✅ PASS | This *is* the touch/mobile experience; chosen by primary pointer, not width. Buttons guarantee the gesture-free path; desktop keeps the list. |

**Result**: All gates pass → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-swipe-cards/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1 — no schema change (session deck order)
├── quickstart.md        # Phase 1 — verification (touch + non-touch)
├── contracts/
│   └── deck.md          # pure orderDeck()/swipeOutcome() contracts
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
apps/web/src/
├── domain/
│   ├── deck.ts            # NEW — pure orderDeck(yaTasks, deferredIds) + swipeOutcome(dx, threshold)
│   └── deck.test.ts       # NEW — failing-first unit tests
├── components/
│   ├── useCoarsePointer.ts # NEW — matchMedia('(pointer: coarse)') hook (live)
│   ├── TaskCard.tsx        # NEW — one card: drag (Pointer Events) + Hecha/Posponer buttons
│   ├── TaskDeck.tsx        # NEW — holds deferredIds (session), renders current card or "¡Todo al día!"
│   ├── TaskItem.tsx        # existing (reused by lists and by the card body)
│   └── TaskGroups.tsx      # modify: render deck for "ya" when coarse pointer, else the list
└── pages/TasksPage.tsx     # unchanged (still renders TaskGroups + Nueva tarea)
apps/web/tests/e2e/
└── swipe-deck.spec.ts      # NEW — touch context: deck, buttons, defer/done, empty; + fine-pointer shows list
```

**Structure Decision**: Single app, no new packages, no new runtime dependency.
The deck is two small components plus one pure ordering module; the card body
reuses the existing task rendering so visuals stay consistent (Principle VII).

## Complexity Tracking

> No constitution violations — no entries required.
