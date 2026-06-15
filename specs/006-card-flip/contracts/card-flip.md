# Contract: Card Flip (UI)

**Feature**: 006-card-flip

No new module/API. Behaviour of the deck's active `TaskCard`:

- **Tap** (pointer down→up with |Δx| below the swipe threshold) ⇒ toggle a
  `flipped` view state (front ⇄ back) with a turn animation.
- **Front** = current task summary (name, date/overdue, group) as today.
- **Back** = `task.description`, or a muted "Sin descripción" when absent.
- **Drag** past the threshold ⇒ existing action (right = done, left = defer);
  never a flip.
- Advancing/replacing the card ⇒ new card shown on its **front**.
- Buttons (Hecha/Posponer) act regardless of face; list view has no flip.

### Guarantees (verified by tests)
- `swipeOutcome` (already unit-tested) governs tap (cancel) vs act
  (done/defer) — unchanged.
- e2e: tap flips and shows the description; tap again returns to front; a real
  right-drag still completes (does not just flip); after completing, the next
  card shows its front; the list view never flips.
