# Feature Specification: Flip Card to See the Description

**Feature Branch**: `006-card-flip`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "En la baraja (táctil), al tocar la tarjeta actual se da la vuelta con una animación de giro y en el dorso muestra la descripción; al tocarla otra vez vuelve a la cara frontal. Distinguir el toque (giro) del deslizamiento (hecha/posponer). Al avanzar a la siguiente tarjeta, vuelve a su cara frontal. Solo la baraja; la lista no cambia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tap a card to read its description (Priority: P1) 🎯 MVP

In the swipe deck (touch view), the front of the card shows the task's name,
date/overdue and group as today. **Tapping** the card flips it over with a
turn animation; the **back** shows the task's **description**. Tapping again
flips it back to the front. Advancing to another card (by completing, deferring,
or it being replaced) always shows the new card on its front.

**Why this priority**: It is the whole feature — getting to a task's detail
without leaving the deck, while keeping the swipe gestures intact.

**Independent Test**: On a touch device, with a card that has a description, tap
it → it flips and shows the description; tap again → front; swipe/dismiss it →
the next card shows its front. Tap vs swipe are distinguished (a small tap
flips; a real drag still acts).

**Acceptance Scenarios**:

1. **Given** the active card (front), **When** the user taps it (without dragging), **Then** it flips with a turn animation and shows the task's description on the back.
2. **Given** a flipped card (back), **When** the user taps it again, **Then** it flips back to the front.
3. **Given** the active card, **When** the user drags it past the swipe threshold (right/left), **Then** it acts as today (right = done, left = defer) and does NOT merely flip.
4. **Given** a flipped card, **When** the user advances to the next card (via Hecha/Posponer or a sync change), **Then** the next card is shown on its front (flip state does not carry over).
5. **Given** a card whose task has no description, **When** the user taps it, **Then** the back indicates there is no description (e.g. "Sin descripción") — or the card does not flip — per Assumptions; no empty/broken back is shown.
6. **Given** the list view (non-touch or "Ver como lista"), **When** the user interacts, **Then** there is no flip; the list behaves as today.

---

### Edge Cases

- A short drag that is released below the swipe threshold counts as a tap → it flips (consistent with "no real movement = tap").
- A long description on the back scrolls or is contained within the card; the card size does not change between faces.
- Tapping the action buttons (Hecha/Posponer) below the card never flips; they always act on the current card regardless of which face is showing.
- Marking done / deferring while flipped still works (the gesture/buttons act); the replacement card appears on its front.
- Overdue styling (red) applies to the front as today; the back is the detail face.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: In the deck, a tap on the active card (a press-release with negligible movement) MUST flip the card with a turn animation to reveal the back.
- **FR-002**: The back of the card MUST show the task's description.
- **FR-003**: Tapping a flipped card MUST flip it back to the front.
- **FR-004**: A drag that crosses the swipe threshold MUST perform the existing action (right = done, left = defer) and MUST NOT be treated as a tap/flip; a drag released below the threshold is treated as a tap.
- **FR-005**: When the active card changes (advance/replacement), the newly shown card MUST be on its front (flip state is per-card and not carried over).
- **FR-006**: Tapping a card whose task has no description MUST NOT show an empty/broken back (see Assumptions for the chosen behaviour).
- **FR-007**: The flip MUST be confined to the deck card; the list view (non-touch or forced) MUST be unaffected.
- **FR-008**: All existing deck behaviour MUST be preserved: swipe/buttons (Hecha/Posponer), overdue styling, ordering, the "Ver como lista/tarjetas" toggle, and sync.

### Key Entities

- **Task** *(unchanged)*: the back simply displays the existing `description`; no new data.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is stored and readable on the device?**
Unchanged — the flip is a presentation of the task's already-local description;
it works fully offline.

**What happens to writes?**
None — flipping is a view-only interaction; no write, no new state persisted.

**Conflict-resolution rule on sync:**
N/A — no data is written by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from the front of a card to reading its description in a single tap, and back in one more tap.
- **SC-002**: Tap and swipe are reliably distinguished: a deliberate swipe completes/defers (never just flips), and a tap flips (never accidentally completes/defers).
- **SC-003**: After dismissing or advancing a card, the next card is shown on its front 100% of the time.
- **SC-004**: The flip never appears in the list view; the list is byte-for-behaviour as today.

## Assumptions

- **Tap vs swipe**: a pointer press-release whose horizontal travel stays below
  the existing swipe threshold is a tap (flip); at/above the threshold it is a
  swipe (done/defer). This reuses the established threshold.
- **No-description card**: tapping still flips, and the back shows a muted
  "Sin descripción" placeholder, so the interaction is consistent for every
  card. (Alternative — not flipping when there's no description — is available
  if preferred.)
- **Flip is view-only and per-card session state**: not persisted, reset when
  the card changes; same card height on both faces; long descriptions scroll
  within the back.
- **Touch only**: flipping exists only in the deck (touch / cards view); the
  list view (desktop or "Ver como lista") shows the description inline as today,
  with no flip.
- **Builds on features 004 (deck) and 005 (description)**: no new data; reuses
  the existing card, swipe threshold, and the task's description.
