# Implementation Plan: Flip Card to See the Description

**Branch**: `006-card-flip` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)

## Summary

In the touch deck, the active `TaskCard` becomes a two-faced card: front = the
current task summary (as today), back = the task description. A **tap** (press-
release below the swipe threshold) flips it (CSS 3D rotateY); a **drag** past the
threshold still does Hecha/Posponer. Flip is per-card view state, reset when the
card changes. UI-only; no data, no schema, no sync change. Reuses the existing
swipe threshold (`swipeOutcome`) and the task's `description` (feature 005).

See [research.md](./research.md), [data-model.md](./data-model.md) (no data),
[contracts/card-flip.md](./contracts/card-flip.md).

## Technical Context

TypeScript 5.x · React 18 · no new deps (CSS 3D transform + Pointer Events) ·
no storage/sync change · Testing: Vitest (tap-vs-swipe decision stays pure via
`swipeOutcome`, already tested) + Playwright (tap flips/back, swipe still acts,
advance resets) · PWA mobile-first.

## Constitution Check (v4.1.0)

| # | Principle | Status | How |
|---|-----------|--------|-----|
| I | Local-First | ✅ | View-only; description already local; works offline. |
| II | One Language/Types | ✅ | TS only; no SQL; reuses Task.description. |
| III | Spec Before Code | ✅ | spec (16/16) + plan precede code. |
| IV | Test-First Domain | ✅ | Tap/swipe split reuses pure `swipeOutcome` (already unit-tested: below threshold → cancel/tap). Flip itself is UI → e2e. |
| V | Cheap | ✅ | No service. |
| VI | Single Env | ✅ | No backend change. |
| VII | Simplicity | ✅ | Two faces + a rotateY class; no library; no new module. |
| VIII | Tenant-Ready | ✅ | No data. |
| IX | Mobile-First | ✅ | This is the touch interaction; list view untouched. |

All gates pass → Complexity Tracking empty.

## Project Structure

```text
apps/web/src/components/TaskCard.tsx  # flipped state; tap (below threshold) toggles flip; front/back faces
apps/web/src/index.css                # 3D flip (faces carry the card surface; peeks self-contained)
apps/web/tests/e2e/card-flip.spec.ts  # tap → description on back; tap → front; swipe still acts; advance resets
```

**Structure Decision**: All change is inside `TaskCard` + CSS; `TaskDeck`/list
unchanged. The card surface (border/bg) moves onto the two faces; peek cards get
their own surface so the shared rule split stays clean.

## Complexity Tracking

> No violations.
