# Feature Specification: Swipe-to-complete in the task list (touch)

**Feature Branch**: `011-swipe-list-complete`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Apply swipe cards mechanism to tasks list view."
Clarified: swiping a list row **right** marks it **done** (single direction, no
left action); applies to **all pending rows** ("Para hacer ya" when viewed as a
list and "Para hacer pronto"); completed rows ("Hechas") are not swipeable.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete a pending task with a swipe (Priority: P1) 🎯 MVP

On a touch device, in any list of **pending** tasks the user can flick a row to
the **right** to mark it done — the same gesture as the "Para hacer ya" deck,
brought to the list. The row slides off and the task moves to "Hechas
recientemente". The existing checkbox keeps working unchanged as the
gesture-free path.

**Why this priority**: It is the whole feature — the deck's quick "done" flick,
made available wherever pending tasks appear as a list (the forced list view and
the "pronto" section), so completing a task never requires aiming at a checkbox.

**Independent Test**: On a touch device, with a pending task shown as a list row,
drag the row right past the threshold and confirm it is marked done (leaves its
pending list, appears in "Hechas recientemente"); a short or leftward drag leaves
it unchanged.

**Acceptance Scenarios**:

1. **Given** a pending task shown as a list row on touch, **When** the user swipes the row right past the threshold, **Then** the task is marked done and moves to "Hechas recientemente".
2. **Given** a pending row, **When** the user drags it right but releases before the threshold, **Then** the row snaps back and nothing changes.
3. **Given** a pending row, **When** the user swipes left, **Then** nothing happens (left has no action); the row returns to place.
4. **Given** a "Para hacer pronto" task, **When** the user swipes its row right, **Then** it is completed exactly as a "ya" task would be.
5. **Given** a completed task in "Hechas recientemente", **When** the user tries to swipe it, **Then** there is no swipe action (completed rows are not swipeable; the checkbox still reverts it).

---

### User Story 2 - Gesture is additive, never the only path (Priority: P2)

The checkbox, "Editar" and recurrence link buttons on a row keep working; a
swipe never fires when the gesture starts on one of those controls, and the page
still scrolls vertically through the lists. On a non-touch device (mouse/
desktop) the list is unchanged — no swipe — matching the deck being touch-only.

**Acceptance Scenarios**:

1. **Given** a pending row, **When** the user starts a drag on the checkbox or a link button, **Then** no swipe begins (the control behaves normally).
2. **Given** a long list, **When** the user drags vertically, **Then** the page scrolls and no row is swiped (horizontal intent is required).
3. **Given** a non-touch environment, **When** a list is shown, **Then** rows are not swipeable; the checkbox is the way to complete.

---

### Edge Cases

- **Reduced motion**: the row is completed without the slide-out animation.
- **Partial / cancelled swipe**: releasing before the threshold snaps the row back, no action.
- **Recurring task**: swiping a recurring pending task right completes the occurrence exactly like the checkbox / deck (materialization handled by `markDone`).
- **Interactive controls**: a gesture beginning on the checkbox/links never turns into a swipe.

## Requirements *(mandatory)*

- **FR-001**: On a touch (coarse-pointer) device, a **pending** task rendered as a list row MUST be completable by swiping the row right past the action threshold (80 px, same as the deck).
- **FR-002**: Left swipes and drags released before the threshold MUST take no action and return the row to its place.
- **FR-003**: Swipe-to-complete MUST apply to every pending list row — "Para hacer ya" shown as a list and "Para hacer pronto" — and MUST NOT apply to completed rows in "Hechas recientemente".
- **FR-004**: A gesture starting on an interactive control (checkbox, "Editar"/recurrence links) MUST NOT start a swipe.
- **FR-005**: Vertical scrolling through the lists MUST be preserved; only a predominantly horizontal gesture starts a swipe.
- **FR-006**: The existing checkbox MUST continue to complete/revert a task, so the feature is additive and accessible.
- **FR-007**: On a non-touch device the list MUST be unchanged (no swipe), consistent with the touch-only deck.

## Success Criteria *(mandatory)*

- **SC-001**: A pending list row swiped right is completed and reflected locally within 1 s.
- **SC-002**: No task is completed by a leftward or sub-threshold gesture, nor by a vertical scroll.
- **SC-003**: Completing via swipe and via the checkbox produce identical results (including recurring tasks).
