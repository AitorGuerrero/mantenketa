---
description: "Task list for feature 006 — flip card to see the description"
---

# Tasks: Flip Card to See the Description

**Input**: Design docs in `/specs/006-card-flip/`. UI-only; reuses `swipeOutcome`
(unit-tested) and `Task.description` (005).

## Phase 1: Card flip

- [X] T001 `TaskCard` (`apps/web/src/components/TaskCard.tsx`): add `flipped` state; on pointer-up with `swipeOutcome === 'cancel'` toggle flip (else fly as today); render front face (TaskBody) + back face (description or "Sin descripción") inside a preserve-3d flip container; keep drag translateX on the outer card
- [X] T002 [P] `apps/web/src/index.css`: 3D flip (preserve-3d, rotateY(180deg) when flipped, backface-hidden faces); move the card surface (border/bg/shadow/padding) onto the faces; give peek cards their own surface; overdue border on the faces; respect `prefers-reduced-motion` (instant flip)

## Phase 2: e2e & validation

- [X] T003 Playwright e2e `apps/web/tests/e2e/card-flip.spec.ts` (touch context): tap flips and shows the description on the back; tap again → front; a real right-drag still completes (not just flips); after advancing, the next card shows its front; no-description card flips to "Sin descripción"
- [X] T004 Full validation: `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm test:e2e`, `pnpm test:rls` green; features 001–005 regression-free; SPDX headers unchanged files OK

## Notes
- No data/schema/sync change. Total: 4 tasks.
