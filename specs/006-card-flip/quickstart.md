# Quickstart: Flip Card

**Feature**: 006-card-flip · UI-only; no backend/schema/sync change.

```bash
pnpm --filter @mantenketa/web dev
pnpm --filter @mantenketa/web test       # vitest (swipeOutcome unchanged)
pnpm --filter @mantenketa/web test:e2e   # playwright: card-flip
pnpm --filter @mantenketa/web lint
```

## Verify (touch / device toolbar)
1. Create a task with a description. Tap its card → it flips and shows the
   description on the back. Tap again → front.
2. Drag right past the threshold → it completes (Hecha); does not merely flip.
3. After it leaves, the next card shows its front.
4. A task without a description: tapping flips to a "Sin descripción" back.
5. "Ver como lista" (or desktop): no flip; list unchanged.
