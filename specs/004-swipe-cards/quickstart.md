# Quickstart: Swipeable Cards for "Para hacer ya"

**Feature**: 004-swipe-cards · UI over the existing local store; no backend,
schema, or dependency change. Touch experience (Constitution Principle IX).

## Develop & test

```bash
pnpm install
pnpm --filter @mantenketa/web dev

pnpm --filter @mantenketa/web test       # vitest: orderDeck + swipeOutcome (test-first)
pnpm --filter @mantenketa/web test:e2e   # playwright: deck on touch + list on desktop
pnpm --filter @mantenketa/web lint
```

New pure logic: `apps/web/src/domain/deck.ts` (`orderDeck`, `swipeOutcome`) with
`deck.test.ts` written to fail first (Principle IV).

## Verify the feature

**On touch** (phone, or DevTools device toolbar / responsive mode emulating a
mobile device so the primary pointer is coarse):

1. With ≥2 "hacer ya" tasks, the "Para hacer ya" area shows **one card**, not a list.
2. **Swipe right** (or tap **Hecha**) → the task is completed, moves to "Hechas
   recientemente", and the next card appears.
3. **Swipe left** (or tap **Posponer**) → the task goes to the back; the next
   card appears; cycling returns to it.
4. With one card left, **Posponer** keeps the same card.
5. Empty the deck → **"¡Todo al día!"**. Scroll down → "Para hacer pronto" and
   "Hechas recientemente" as normal lists.
6. An overdue task's card is highlighted as overdue.
7. Reload → defer order resets; no task changed.

**On non-touch** (desktop with a mouse):

8. "Para hacer ya" is the **existing list** (no deck, no swipe); "pronto"/"hechas"
   unchanged — feature 003 behaviour intact.

## Regression

- Feature 001/002/003 suites stay green (create/validation, complete/revert,
  scope, sync, grouping). `pnpm test`, `test:rls`, `test:e2e`.
