# Implementation Plan: Dim and block tasks assigned to someone else

**Branch**: `014-dim-others-tasks` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

## Summary

Small UI feature over assignment (012). A new pure helper
`assignedToOther(task, userId)` (mirror of `assignedToMe`) drives:
- a dim (50% opacity) on the list row (`task-item--others`) and the deck card
  (via inline opacity, since the card already sets opacity inline);
- disabling the **complete** path: in the list the swipe action becomes `null`
  for those tasks; the deck `TaskCard` gains an `actionable` prop that blocks
  swipe-to-done and the "Hecha" button (defer/Posponer stays allowed).

No data, schema, sync or backend change — purely presentational + gesture gating.

## Constitution Check

- **I/V/VI/VIII** — PASS. No data/migration/backend change.
- **II** — PASS. Reuses `Task`/assignment helpers; no new types.
- **III** — PASS. spec + plan before code.
- **IV. Test-First** — PASS. `assignedToOther` is pure and unit-tested first.
- **VII** — PASS. Reuses the existing `assignedToMe` pattern and the card's
  existing opacity/fly plumbing; one boolean prop on `TaskCard`.
- **IX. Mobile-First** — PASS. Verified at a narrow viewport (deck is touch).

**Result**: PASS.

## Changes

- `apps/web/src/domain/assignment.ts` — NEW `assignedToOther`; `assignment.test.ts` test-first.
- `apps/web/src/components/TaskItem.tsx` — `task-item--others` class + swipe action `null` when assigned to other.
- `apps/web/src/components/TaskCard.tsx` — `actionable` prop: block done (swipe + fly guard), dim via inline opacity.
- `apps/web/src/components/TaskDeck.tsx` — pass `actionable`; disable the "Hecha" button for others' tasks.
- `apps/web/src/index.css` — `.task-item--others { opacity: .5 }`.
- e2e (Supabase-gated) in `tests/e2e/assign-tasks.spec.ts` or new: a task assigned to another member is dimmed and not completable by swipe.

## Verification

`pnpm test`, `pnpm lint`, `pnpm exec tsc -b`, `pnpm exec playwright test`, `pnpm build`.
Manual: with two members, assign a task to the other and confirm it shows at 50%
and swiping it does not complete it.
