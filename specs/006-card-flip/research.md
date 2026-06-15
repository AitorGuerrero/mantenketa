# Phase 0 Research: Flip Card

**Feature**: 006-card-flip · 2026-06-14

## Decision 1: Tap vs swipe via the existing threshold
On pointer release, `swipeOutcome(dx, THRESHOLD)`: `done`/`defer` ⇒ act (as
today); `cancel` (|dx| < threshold) ⇒ it was a tap ⇒ toggle flip. Reuses the
proven, unit-tested decision (Principle IV/VII); no new gesture logic.

## Decision 2: CSS 3D flip, faces carry the surface
The card holds a `transform-style: preserve-3d` flip container with two
absolutely-positioned faces (`backface-visibility: hidden`); `rotateY(180deg)`
when flipped. The drag `translateX` stays on the outer card so it composes with
the inner `rotateY` without conflict. The card border/bg/shadow move onto the
faces; peek cards keep their own surface (independent), so the active card and
peeks no longer share a visual rule that would double-up.

## Decision 3: Flip is per-card, view-only
`flipped` is local state in `TaskCard`; since `TaskCard` is keyed by `task.id`,
advancing remounts it on the front (FR-005). No persistence, no write.

## Decision 4: No-description back
The back always exists; if the task has no description it shows a muted
"Sin descripción" so every card flips consistently (documented default).

| Unknown | Resolution |
|---------|-----------|
| Tap vs swipe | existing threshold via swipeOutcome (below ⇒ flip) |
| Flip mechanism | CSS 3D rotateY, two backface-hidden faces |
| Drag vs flip transform | translateX on card, rotateY on inner container |
| Flip state | per-card local state, reset on advance (key=id) |
| No description | back shows "Sin descripción" |

No NEEDS CLARIFICATION remain.
