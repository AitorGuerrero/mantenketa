# Feature Specification: Swipe-to-complete in the task list (touch)

**Feature Branch**: `011-swipe-list-complete`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Apply swipe cards mechanism to tasks list view."
followed by "Remove the items checkbox" and "swipe replaces it".

Clarified scope: the row **checkbox is removed**; horizontal swipe is the only
list interaction and works on **all pointers** (mouse + touch). A **pending**
row swiped **right** is marked **done** (tinting green as it goes); a
**completed** row swiped **left** is **reverted** to pending (tinting grey). The
opposite direction on each does nothing. While swiping right the row background
fills gradually toward green to signal completion.

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
5. **Given** a completed task in "Hechas recientemente", **When** the user swipes it left, **Then** it is reverted to pending (see User Story 2).

---

### User Story 2 - Revert a completed task with a swipe (Priority: P2)

Since the checkbox is gone, a completed task in "Hechas recientemente" is
returned to pending by swiping its row **left** (tinting grey toward the action);
swiping it right does nothing. The "Editar"/recurrence link buttons still work; a
swipe never fires when the gesture starts on one of those controls, and the page
still scrolls vertically. The gesture works with a mouse too, so desktop has no
checkbox either.

**Acceptance Scenarios**:

1. **Given** a completed row, **When** the user swipes it left past the threshold, **Then** it is reverted to pending and leaves "Hechas".
2. **Given** a completed row, **When** the user swipes it right, **Then** nothing happens.
3. **Given** a pending row, **When** the user starts a drag on a link button, **Then** no swipe begins (the control behaves normally).
4. **Given** a long list, **When** the user drags vertically, **Then** the page scrolls and no row is swiped (horizontal intent is required).
5. **Given** a desktop (mouse) environment, **When** a list is shown, **Then** rows are swipeable with a click-drag; there is no checkbox.

---

### Edge Cases

- **Reduced motion**: the row is completed without the slide-out animation.
- **Partial / cancelled swipe**: releasing before the threshold snaps the row back, no action.
- **Recurring task**: swiping a recurring pending task right completes the occurrence exactly like the checkbox / deck (materialization handled by `markDone`).
- **Interactive controls**: a gesture beginning on the checkbox/links never turns into a swipe.

## Requirements *(mandatory)*

- **FR-001**: A **pending** task list row MUST be completable by swiping it right past the action threshold (80 px, same as the deck), with the row tinting green proportionally as it is dragged.
- **FR-002**: On a pending row, left swipes and drags released before the threshold MUST take no action and return the row to its place.
- **FR-003**: Swipe-to-complete MUST apply to every pending list row — "Para hacer ya" shown as a list and "Para hacer pronto".
- **FR-004**: A **completed** row MUST be revertible to pending by swiping it **left** past the threshold (tinting grey); swiping a completed row right MUST do nothing.
- **FR-005**: The row **checkbox MUST be removed**; horizontal swipe is the only complete/revert affordance in the list.
- **FR-006**: The gesture MUST work with any primary pointer (mouse and touch); there is no checkbox on desktop either.
- **FR-007**: A gesture starting on an interactive control ("Editar"/recurrence links) MUST NOT start a swipe, and vertical scrolling MUST be preserved (only a predominantly horizontal gesture starts a swipe).

## Success Criteria *(mandatory)*

- **SC-001**: A pending row swiped right is completed (and a completed row swiped left is reverted) and reflected locally within 1 s.
- **SC-002**: No task changes state from a sub-threshold gesture, the wrong direction, or a vertical scroll.
- **SC-003**: Completing/reverting via swipe produces the same results the checkbox used to (including recurring tasks).
