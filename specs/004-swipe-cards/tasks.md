---
description: "Task list for feature 004 — swipeable cards for 'Para hacer ya' (touch)"
---

# Tasks: Swipeable Cards for "Para hacer ya" (touch)

**Input**: Design documents from `/specs/004-swipe-cards/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/deck.md

**Tests**: Principle IV — failing-first unit tests for the pure deck logic
(`orderDeck`, `swipeOutcome`). Gesture + pointer-media branch via Playwright e2e.

**Organization**: by user story. Builds on feature 003. No backend/schema change.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundational — pure deck logic (test-first)

- [ ] T001 [P] Failing unit tests in `apps/web/src/domain/deck.test.ts`: `orderDeck` (no-defer identity, defer-to-back, multiple defers keep order, drop ids absent from ya, purity) and `swipeOutcome` (>=+threshold→done, <=-threshold→defer, between→cancel, inclusive boundaries)
- [ ] T002 Implement pure `orderDeck(yaTasks, deferredIds)` + `swipeOutcome(dx, threshold)` in `apps/web/src/domain/deck.ts` (makes T001 pass)

---

## Phase 2: US1 — Triage today's tasks as a swipe deck (P1) 🎯 MVP

- [ ] T003 [P] [US1] `useCoarsePointer()` hook in `apps/web/src/components/useCoarsePointer.ts` — live `matchMedia('(pointer: coarse)')`
- [ ] T004 [US1] `TaskCard` in `apps/web/src/components/TaskCard.tsx`: render the task (reuse TaskItem body / overdue highlight), Pointer-Events drag with `setPointerCapture`, translate under finger, on release call `swipeOutcome` → `onDone`/`onDefer`/snap-back; fly-out animation disabled under `prefers-reduced-motion`
- [ ] T005 [US1] `TaskDeck` in `apps/web/src/components/TaskDeck.tsx`: hold `deferredIds` (session state), compute `orderDeck(yaTasks, deferredIds)`, render current `TaskCard` or "¡Todo al día!"; right→`markDone`, left→append id (depends on T002, T004)
- [ ] T006 [US1] Wire into `apps/web/src/components/TaskGroups.tsx`: when `useCoarsePointer()` render `TaskDeck` for the "ya" group, else the existing list section; "pronto"/"hechas" always lists (depends on T003, T005)
- [ ] T007 [P] [US1] Card/deck styles in `apps/web/src/index.css` (card, stack depth, drag transform, overdue on card, reduced-motion guard)
- [ ] T008 [US1] Failing Playwright e2e `apps/web/tests/e2e/swipe-deck.spec.ts` (touch-emulated context): deck shows one card; "Hecha" completes + advances + appears in hechas; "Posponer" defers to back + advances; single card stays on defer; empty → "¡Todo al día!"; lists below reachable; best-effort pointer-drag for one swipe

**Checkpoint**: deck works on touch.

---

## Phase 3: US2 — Gesture-free & non-touch fallback (P2)

- [ ] T009 [US2] Ensure `TaskCard` shows visible "Hecha" and "Posponer" buttons wired to the same `onDone`/`onDefer` (covered in T004; verify labels/roles for a11y)
- [ ] T010 [US2] Add to `swipe-deck.spec.ts` a fine-pointer (desktop) case: "Para hacer ya" renders as the list, no deck/swipe (SC-004 regression)

---

## Phase 4: Polish & Validation

- [ ] T011 [P] SPDX headers on new files (`deck.ts`, `deck.test.ts`, `useCoarsePointer.ts`, `TaskCard.tsx`, `TaskDeck.tsx`)
- [ ] T012 Full validation: `pnpm test` (incl. deck), `pnpm lint`, `pnpm build`, `pnpm test:e2e` all green; feature 001/002/003 e2e regression-free; verify quickstart (touch + non-touch)

---

## Dependencies & Execution Order

- Phase 1 (T001 fail → T002) → US1 → US2 → Polish.
- T004 before T005 (deck renders the card); T003 + T005 before T006.
- e2e (T008) may be written alongside but must fail before the deck lands.

## Notes

- No schema/Dexie/Supabase change; deck order is in-memory session state.
- No new runtime dependency (native Pointer Events + matchMedia).
- Total: 12 tasks (Foundational 2, US1 6, US2 2, Polish 2).
