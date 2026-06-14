# Feature Specification: Swipeable Cards for "Para hacer ya" (touch)

**Feature Branch**: `004-swipe-cards`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "En dispositivos táctiles, el grupo «Para hacer ya» se muestra como una baraja de tarjetas deslizables (tipo Tinder / chats pendientes de Slack): una tarjeta a la vez; deslizar a la derecha = marcar hecha; deslizar a la izquierda = enviar al final de la baraja (solo en esta sesión); botones «Hecha»/«Posponer» equivalentes; baraja vacía = «¡Todo al día!»; debajo, al hacer scroll, las listas de «pronto» y «hechas» normales. En no táctil, la vista de listas actual no cambia."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Triage today's tasks one card at a time (Priority: P1) 🎯 MVP

On a touch device, the user opens the app and the **"Para hacer ya"** group is a
**deck of cards**: one task shown at a time as a large card. They deal with it
with a flick:

- **Swipe right** → mark the task **done**; the card flies off and the next
  pending card appears.
- **Swipe left** → send the task to the **back of the deck** (defer for now,
  this session only); the next card appears.

They keep going until there are no "hacer ya" tasks left, at which point the
deck shows **"¡Todo al día!"**. Scrolling down still reveals the normal
"Para hacer pronto" and "Hechas recientemente" lists.

**Why this priority**: This is the whole feature — turning the most urgent group
into a focused, one-at-a-time triage on the phone, where the user actually uses
the app. It is independently valuable and testable on a touch device.

**Independent Test**: On a touch (coarse-pointer) device with several "hacer ya"
tasks, confirm only one card shows at a time, swiping right completes it and
advances, swiping left defers it to the back and advances, and emptying the deck
shows "¡Todo al día!" with the lists still below.

**Acceptance Scenarios**:

1. **Given** a touch device with two or more "hacer ya" tasks, **When** the home loads, **Then** the "Para hacer ya" area shows a single card (the first task) rather than a list.
2. **Given** a card is shown, **When** the user swipes it right, **Then** that task is marked done (it leaves "hacer ya" and appears in "Hechas recientemente") and the next pending card appears.
3. **Given** a card is shown with other cards behind it, **When** the user swipes it left, **Then** that task is moved to the back of the deck (not completed) and the next card appears; swiping through eventually returns to the deferred task.
4. **Given** the deck has tasks, **When** the user marks the last remaining card done (or there were none), **Then** the deck shows "¡Todo al día!".
5. **Given** only one card remains, **When** the user swipes it left (defer), **Then** the same card stays shown (there is nothing else to advance to).
6. **Given** the user is on the deck, **When** they scroll down, **Then** "Para hacer pronto" and "Hechas recientemente" are shown as normal lists beneath the deck.
7. **Given** an overdue task is on a card, **When** it is shown, **Then** it is visually marked overdue (consistent with the list view).
8. **Given** the user reloads the app, **When** the deck reappears, **Then** any left-swipe "defer" ordering is reset (it was only for that session); no task data changed.

---

### User Story 2 - Act without gestures (buttons & non-touch) (Priority: P2)

Each card also shows two buttons — **"Hecha"** and **"Posponer"** — doing exactly
the same as swiping right and left, so the feature works without a swipe gesture
and is usable with assistive technology. On a non-touch device (mouse/desktop),
the home keeps the existing list view from feature 003 unchanged.

**Why this priority**: Accessibility and input-independence — the deck must not be
gesture-only — and a clean fallback so desktop users are unaffected.

**Independent Test**: On a card, tap "Hecha" → same result as swipe right; tap
"Posponer" → same as swipe left. On a non-touch (fine-pointer) environment,
confirm "Para hacer ya" renders as the existing list, not a deck.

**Acceptance Scenarios**:

1. **Given** a card, **When** the user taps "Hecha", **Then** the task is marked done and the next card appears (identical to swipe right).
2. **Given** a card with others behind it, **When** the user taps "Posponer", **Then** the task moves to the back of the deck and the next card appears (identical to swipe left).
3. **Given** a non-touch environment (primary pointer is fine, e.g. desktop with a mouse), **When** the home loads, **Then** "Para hacer ya" is the existing list view (no deck, no swipe), and "pronto"/"hechas" lists are unchanged.
4. **Given** any environment, **When** "Para hacer pronto" or "Hechas recientemente" are shown, **Then** they are always lists (never cards).

---

### Edge Cases

- **Live updates while triaging**: if a "hacer ya" task is completed elsewhere (e.g. another nucleus member, via sync), its card disappears from the deck; a newly created or newly-arrived "hacer ya" task joins the deck in its normal sorted position (it is not auto-deferred).
- **Deferred then completed**: a task deferred (left) earlier this session can still be completed when it comes back around (right/"Hecha").
- **Empty from the start**: with no "hacer ya" tasks, the deck shows "¡Todo al día!" immediately; the lists below still render.
- **Reduced motion / no gesture**: the buttons always work; swipe is an enhancement, not the only path.
- **Partial / cancelled swipe**: a drag that is released before crossing the action threshold snaps the card back unchanged (no action taken).
- **Reload / revisit**: defer ordering is in-memory for the session; reloading restores the natural order. No persisted "order" field exists.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On touch-primary environments, the "Para hacer ya" group MUST be presented as a single-card-at-a-time deck instead of a list.
- **FR-002**: Swiping a card right MUST mark its task done (reusing existing completion behaviour) and advance to the next card.
- **FR-003**: Swiping a card left MUST move its task to the back of the deck for the current session only, without completing it and without changing any stored task data, then advance to the next card.
- **FR-004**: Each card MUST provide "Hecha" and "Posponer" controls that perform exactly the same actions as swiping right and left, so the feature is fully usable without gestures.
- **FR-005**: When no "hacer ya" tasks remain, the deck area MUST show a "¡Todo al día!" message.
- **FR-006**: If only one card remains and it is deferred (left/"Posponer"), that same card MUST remain shown.
- **FR-007**: The deck MUST show the task's name, its date or "Hacer ya" status, the overdue highlight when applicable, and (for nucleus tasks) the same indicators as the list view.
- **FR-008**: Below the deck, "Para hacer pronto" and "Hechas recientemente" MUST continue to be shown as normal lists; scrolling reaches them.
- **FR-009**: On non-touch-primary environments, the home MUST keep the existing list view for all groups (no deck, no swipe) — feature 003 behaviour unchanged.
- **FR-010**: "Para hacer pronto" and "Hechas recientemente" MUST always be lists, never cards, in every environment.
- **FR-011**: The session-only defer ordering MUST reset on reload; no new persisted field or ordering is introduced.
- **FR-012**: A swipe released before reaching the action threshold MUST cancel (snap back) with no change.
- **FR-013**: All existing behaviour MUST be preserved: create, complete, revert, personal vs nucleus scope, live sync, overdue highlighting, and the grouping rules from feature 003.

### Key Entities

- **Task** *(unchanged)*: no new fields, no schema change. The deck membership is the same "Para hacer ya" set derived in feature 003; the deck *order* is a transient, in-memory, session-only view concern (deferred tasks moved to the back), never persisted.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is stored and readable on the device?**
Unchanged — all tasks remain readable locally. The deck is a presentation of the
existing "hacer ya" set plus an in-memory defer order; it works fully offline.

**What happens to writes?**
Swipe right / "Hecha" is the existing local-first "mark done" write (queued for
sync as today). Swipe left / "Posponer" performs **no write** — it only reorders
the deck in memory for the session. No new writes are introduced.

**Conflict-resolution rule on sync:**
N/A — no new writable entity. "Mark done" keeps its existing per-task
last-write-wins behaviour; the defer order is local and never synced.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a touch device, the user can complete or defer the current "hacer ya" task with a single swipe (or a single button tap), and the next card appears immediately (under 1 second).
- **SC-002**: A right-swipe/"Hecha" completes the task and it appears in "Hechas recientemente"; a left-swipe/"Posponer" never completes it and never alters its stored data (verified by re-checking the task after reload).
- **SC-003**: Emptying the deck always shows "¡Todo al día!", and the "pronto"/"hechas" lists remain reachable by scrolling in 100% of cases.
- **SC-004**: On a non-touch environment, the home is byte-for-behaviour identical to feature 003 (the deck never appears); the feature 003 e2e suite still passes there.
- **SC-005**: Every card action achievable by swipe is also achievable by a visible button (gesture-free path always available).

## Amendment 2026-06-14 — Stacked deck visuals

Refines the presentation of the deck (no behavioural/data change):

- **FR-014**: The deck MUST render as a visible **stack** — the active card on
  top, fully shown, with the next pending cards peeking behind it (a pile,
  "una encima de otra") rather than a single isolated card. Up to **5** cards are
  shown (the active one plus up to 4 behind); from the **3rd to the 5th** the
  peeking cards fade progressively (decreasing opacity with depth).
- **FR-015**: Posponer/left-swipe MUST **animate** the top card travelling to the
  **back** of the stack (visibly going to the end of the queue) before the next
  card becomes active; Hecha/right-swipe animates the card leaving to the right.
  Animations are skipped under `prefers-reduced-motion` (instant commit).
- **FR-016**: Cards MUST use a **playing-card portrait proportion** (~5:7,
  taller than wide), shown large but bounded so the lists below remain reachable
  by scrolling.
- **FR-017**: The action controls MUST show a **direction arrow** indicating the
  swipe side: "Posponer" with a left arrow (←), "Hecha" with a right arrow (→).
- **FR-018**: The deck MUST offer a **"Ver como lista"** action that switches the
  touch device to the list view (the desktop presentation) for the session; and
  while in that forced list view on a touch device, a **"Ver como tarjetas"**
  action below the "Para hacer ya" list MUST switch back to the deck. On
  non-touch devices neither action appears (there is no card mode).
- **FR-019**: Overdue tasks MUST show **how long ago they were due** ("Venció
  hace N días", or weeks if more than 7 days) instead of the due date, and the
  "Para hacer ya" order MUST be: overdue (earliest-due first), then today, then
  dateless; by creation order within each.

Scope confirmed: the stack contains only the "Para hacer ya" set (option A);
"Para hacer pronto" and "Hechas recientemente" remain lists below.

## Assumptions

- **Touch detection via primary pointer**: the deck is shown when the environment's primary pointer is coarse (a finger) — the standard "is this a touch device" signal — rather than by screen width. A narrow desktop window (mouse) keeps the list; a phone/tablet gets the deck. This is the agreed criterion and is tunable.
- **Deck source & order**: the deck contains exactly the feature-003 "Para hacer ya" set, in that same order, except tasks deferred this session are moved to the back (in the order they were deferred). New/synced "hacer ya" tasks slot into their natural position; they are not auto-deferred.
- **Defer is session-only**: held in memory while the home is open; reset on reload or navigation away. No persistence, no schema change (Principle I/VII).
- **Swipe is an enhancement**: the buttons are the guaranteed path; swipe adds delight. Reduced-motion preferences are respected for the card animation.
- **Builds on feature 003**: reuses the grouping (`groupTasks`), the task rendering, overdue highlight, and `markDone`; only the "ya" presentation on touch changes.
