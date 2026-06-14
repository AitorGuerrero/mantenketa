# Phase 0 Research: Swipeable Cards for "Para hacer ya"

**Feature**: 004-swipe-cards · **Date**: 2026-06-14

UI feature over feature 003. Decisions: how to detect touch, how to swipe
without a library, and what (small) logic is pure/test-first. Constitution v4.1.0.

---

## Decision 1: Touch detection via `matchMedia('(pointer: coarse)')`

**Decision**: A `useCoarsePointer()` hook reads `window.matchMedia('(pointer:
coarse)').matches` and subscribes to changes. When true (primary input is a
finger), "Para hacer ya" renders as the deck; otherwise as the list.

**Rationale**: Matches the user's intent ("environments that accept touch")
better than viewport width: a narrow desktop window (mouse) keeps the list; a
phone/tablet gets the deck. Standard, dependency-free.

**Alternatives considered**:
- Viewport width breakpoint — wrong signal (mouse in a small window). Rejected.
- `'ontouchstart' in window` / `navigator.maxTouchPoints` — true on hybrid
  laptops where touch isn't primary; `(pointer: coarse)` (primary pointer) is
  the more precise "is this primarily touch" check. Hybrid devices that fall to
  the list lose nothing — the buttons remain.

## Decision 2: Swipe via native Pointer Events (no library)

**Decision**: The top card listens to `pointerdown/move/up` (with
`setPointerCapture`), tracks `dx`, translates the card under the finger, and on
release decides via a pure `swipeOutcome(dx, threshold)`:
`dx >= +threshold → 'done'`, `dx <= -threshold → 'defer'`, else `'cancel'`
(snap back). The exit animation is a CSS transform/transition.

**Rationale**: Pointer Events cover touch, pen and mouse with one code path and
no dependency (Principle VII). A swipe deck here is ~one component, not worth a
tinder/animation library (cost + framework magic). `prefers-reduced-motion`
disables the fly-out animation (instant advance).

**Alternatives considered**:
- `react-tinder-card` / `framer-motion` — extra dependency and bundle for a
  trivial interaction. Rejected (Principle V/VII).
- Touch events (`touchstart/move/end`) — older, doesn't unify mouse/pen; Pointer
  Events are the modern standard.

## Decision 3: Deck order is pure + in-memory session state

**Decision**: `orderDeck(yaTasks, deferredIds): Task[]` is a pure function:
non-deferred "ya" tasks first (in feature-003 order), then deferred tasks in
`deferredIds` order, filtered to those still present in the "ya" set. The
`TaskDeck` component holds `deferredIds: string[]` in React state (session only):
left-swipe/"Posponer" appends the current id; right-swipe/"Hecha" calls
`markDone`. The current card is `orderDeck(...)[0]`.

**Rationale**: Keeps the only non-trivial logic pure and unit-testable
(Principle IV). Re-deriving from the live "ya" set means sync/new tasks and
completed-elsewhere tasks reconcile for free; deferred ids that leave the set are
dropped by the filter. Single-card-left + defer naturally keeps the same card
(it's the only element). Reset on reload because state is in-memory.

**Alternatives considered**:
- Persisting an order field — violates "no schema change" and the session-only
  requirement. Rejected.
- Index-based cursor instead of moving ids to the back — fragile under live
  updates (indices shift); id-based reorder is robust.

## Decision 4: What is test-first vs e2e

**Decision**: Unit (Vitest, red-first): `orderDeck` (defer-to-back, filter
vanished ids, stable order, purity) and `swipeOutcome` (threshold/sign/cancel).
e2e (Playwright, touch-emulated context via a mobile device descriptor): deck
shows on coarse pointer, "Hecha"/"Posponer" advance/complete/defer, empty →
"¡Todo al día!", lists below; plus a fine-pointer test asserting the list
(no deck) — covering SC-004 regression.

**Rationale**: Gesture threshold and ordering are logic → pure tests. The DOM
gesture and the pointer-media branch are integration → e2e. Robust e2e uses the
required buttons (deterministic); a best-effort pointer-drag covers the gesture.

---

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Touch vs list decision | `matchMedia('(pointer: coarse)')`, live hook |
| Swipe mechanism | Native Pointer Events + CSS transform; no library |
| Threshold decision | pure `swipeOutcome(dx, threshold)` |
| Deck order | pure `orderDeck(yaTasks, deferredIds)`; deferred → back; filter vanished |
| Defer persistence | in-memory `deferredIds`; reset on reload |
| Animation | CSS transition; disabled under `prefers-reduced-motion` |
| e2e touch | Playwright mobile device context (coarse pointer) |

No `NEEDS CLARIFICATION` items remain.
