# Feature Specification: Task Comments

**Feature Branch**: `017-task-comments`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Comentarios en las tareas, con autor y fecha, editables/borrables por su autor; en grupo compartidos (sincronizados, RLS), en personales solo el dueño. En recurrentes, primero los de la instancia actual y debajo los de instancias anteriores agrupados por instancia y fecha, atenuados. En tarjeta, en el reverso tras la descripción con scroll. En lista, descripción + acciones + comentarios solo al hacer click (acordeón, una abierta a la vez); el deslizar para completar sigue funcionando."

## Summary

Users can write **comments** on a task to leave notes and context. Each comment
records **who** wrote it and **when**. The author can **edit or delete** their own
comments. On **group** tasks comments are shared with all members of the nucleus
(synced, isolated by the same ownership rules as tasks); on **personal** tasks only
the owner sees them. For **recurring** tasks, the current instance's comments show
first, followed by earlier instances' comments **grouped by instance (with each
instance's date as a heading)** in a clearly dimmed style; new comments can only be
added to the current instance. Comments appear on the **card back** (after the
description, scrollable within the card) and, in the **list**, only when the task is
**clicked open** — clicking a task expands its description, action buttons and
comments as an accordion (only one task expanded at a time), while swipe-to-complete
keeps working on the row.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comment on a task and read its comments (Priority: P1) 🎯 MVP

A user adds a comment to a task and sees it listed with the author and date. On a
phone card, comments show on the back after the description and scroll within the
card. In the list, clicking the task reveals its description, actions and comments
(an accordion: opening one closes any other); swiping the row still completes/reverts
it. Empty comments are rejected. The author's name shows ("tú" for oneself in a
group); on personal tasks the author context is just the owner.

**Why this priority**: Writing and reading comments is the entire feature's core
value; it delivers on its own for a single (non-recurring) task on both surfaces.

**Independent Test**: Create a task, add two comments, and confirm they appear with
author + date on the card back (scrollable) and on clicking the row in the list; open
a second task and confirm the first collapses; swipe the row and confirm it still
completes.

**Acceptance Scenarios**:

1. **Given** a task, **When** the user writes a comment and submits, **Then** it appears in that task's comment list with the author and the date/time.
2. **Given** a task with comments, **When** viewed as a card, **Then** the comments appear on the back after the description and the back scrolls if they overflow.
3. **Given** a task row in the list (collapsed), **When** the user clicks it, **Then** its description, action buttons and comments are revealed; **When** the user clicks another task, **Then** the previously expanded one collapses (only one open).
4. **Given** a collapsed or expanded row, **When** the user swipes it, **Then** complete/revert still works (a tap expands; a swipe completes).
5. **Given** the comment input, **When** it is empty or only whitespace, **Then** submitting is rejected and no comment is created.
6. **Given** a group task, **When** a member comments, **Then** every member of that nucleus sees the comment after sync; **Given** a personal task, **Then** only its owner sees comments.

---

### User Story 2 - Edit or delete your own comments (Priority: P2)

The author of a comment can edit its text or delete it. Edited comments are marked as
edited. Other people's comments cannot be edited or deleted by a user. Deleting a
comment removes it for everyone (after sync).

**Why this priority**: Correcting or removing a note is expected, but the feature is
useful without it; secondary to adding/reading.

**Acceptance Scenarios**:

1. **Given** a comment the user wrote, **When** they edit and save it, **Then** the new text shows with an "edited" indicator.
2. **Given** a comment the user wrote, **When** they delete it, **Then** it disappears from the list (and from other members' devices after sync).
3. **Given** a comment written by someone else, **When** the user views it, **Then** no edit or delete action is offered for it.

---

### User Story 3 - Recurring task: see earlier instances' comments (Priority: P3)

For a recurring task, the current instance's comments appear first. Below them, the
comments of earlier instances of the same series appear **grouped per instance**, each
group headed by that instance's date and visually **dimmed** to distinguish them from
the current ones. New comments can be added only to the current instance.

**Why this priority**: Adds history/context for recurring tasks; the core commenting
works without it.

**Acceptance Scenarios**:

1. **Given** a recurring task with commented earlier instances, **When** the user views its comments, **Then** the current instance's comments show first, then one dimmed group per earlier instance that has comments, each headed by that instance's date.
2. **Given** the earlier-instances section, **When** the user tries to comment, **Then** they can only add to the current instance (earlier groups are read-only).
3. **Given** an earlier instance with no comments, **When** viewing history, **Then** no group is shown for it.

---

### Edge Cases

- A task with no comments shows an empty state (e.g., "Sin comentarios") and the input to add one.
- Deleting the last comment returns the task to the empty state.
- A recurring task with no earlier commented instances shows only the current section.
- The comment author has left the group: the stored author name (or a neutral "miembro") is shown; comments remain.
- A completed task can still be viewed and (for the current instance) commented on.
- Two devices edit/delete the same comment offline: last write wins by update time; a delete is not resurrected by a concurrent edit.
- Very long threads: card back scrolls; list expansion grows the row (page scrolls).
- Switching from card to list (or expanding another row) does not lose unsent comment text unexpectedly (drafts are per-task input; losing focus is acceptable, but submitting must be explicit).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to add a text comment to a task; empty/whitespace-only comments MUST be rejected.
- **FR-002**: Each comment MUST record its author (the member who wrote it; none for anonymous/local use) and a creation timestamp, both shown when the comment is displayed.
- **FR-003**: Comments of a task MUST be shown in chronological order (oldest first) within their instance.
- **FR-004**: The author of a comment MUST be able to edit its text (shown thereafter with an "edited" indicator) and delete it; users MUST NOT be able to edit or delete comments they did not write.
- **FR-005**: On **group** tasks, comments MUST be shared with and visible to every member of the task's nucleus and synced across devices; on **personal** tasks, comments MUST be visible only to the owner. Isolation MUST be enforced in the data layer (no cross-nucleus leakage).
- **FR-006**: Comments MUST be available offline: adding, editing and deleting are local-first and queued for sync; a deletion MUST propagate to other devices.
- **FR-007**: For a recurring task, the system MUST show the current instance's comments first, then earlier instances' comments **grouped per instance** with each instance's date as a heading, visually dimmed; only instances that have comments appear.
- **FR-008**: New comments MUST be addable only to the **current** instance of a recurring task; earlier-instance groups are read-only.
- **FR-009**: In **card** view, comments MUST appear on the card back **after the description**, with scrolling contained within the card.
- **FR-010**: In **list** view, a task's description, action buttons and comments MUST be hidden until the row is clicked; clicking expands them (accordion).
- **FR-011**: Only **one** task MUST be expanded at a time in the list; clicking a task collapses any other expanded task.
- **FR-012**: Swipe-to-complete/revert MUST keep working on a list row regardless of its expanded/collapsed state (a tap expands; a swipe completes), with no accidental completion when expanding.
- **FR-013**: A task SHOULD show an indication that it has comments (e.g., a count) when collapsed, so users know to open it. *(If omitted, document why.)*
- **FR-014**: Adding/editing/deleting a comment MUST NOT change the task's own fields (date, urgency, completion, recurrence, scope, assignee, project).

### Key Entities *(include if feature involves data)*

- **Comment** *(new)*: a note attached to one task instance. Attributes: author (member, or none for anonymous), text, created/updated timestamps, an edited indicator (derivable), and the ownership/scope it inherits from its task (owner for personal; nucleus for group) so visibility/isolation match the task. Belongs to a task; for recurring tasks, comments of the same series are related through the task's series so earlier instances' comments can be grouped by instance.
- **Task** *(existing, referenced)*: the thing being commented on; unchanged by this feature. A recurring task's series links instances so their comments can be aggregated.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is stored and readable on the device?**
All comments for the user's visible tasks are stored locally and readable offline,
including the grouped history for recurring tasks. New comments and edits/deletes are
made locally first and shown immediately.

**What happens to writes?**
Adding, editing and deleting a comment are local writes queued for sync (like task
writes). Group-task comments propagate to other members; personal ones stay with the
owner. Deletions are queued and propagate (a removed comment disappears elsewhere).

**Conflict-resolution rule on sync:**
Per-comment last-write-wins by update timestamp; a delete takes precedence over a
concurrent edit (a deleted comment is not resurrected). Comments are independent rows,
so concurrent comments by different members all survive.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a comment and see it (with author + date) in under 5 seconds, offline included.
- **SC-002**: On a group task, a comment added by one member is visible to another member within a few seconds of sync, 100% of the time, and never visible to non-members.
- **SC-003**: In the list, exactly one task is expanded at a time; opening a task collapses any other, and the comments/description/actions are hidden until opened.
- **SC-004**: Swiping a list row completes/reverts it as before in 100% of attempts, with no accidental completion caused by the new tap-to-expand.
- **SC-005**: For a recurring task, the current instance's comments always appear before earlier ones, and earlier ones are grouped by instance date and visually distinct.
- **SC-006**: Only a comment's author sees edit/delete for it; others never can.
- **SC-007**: On a phone card, a long comment thread is fully reachable by scrolling within the card without breaking the card layout.

## Assumptions

- **Author + timestamp, author-only edit/delete** (confirmed): no group-admin moderation; only the writer edits/deletes their own. Anonymous/local comments have no author and are editable/deletable on that device.
- **Ordering**: oldest-first within an instance (reads like a conversation); earlier-instance groups ordered most-recent-instance first or by date — a UI detail to settle in design.
- **Edited indicator**: a simple "(editado)" marker when a comment was changed after creation.
- **Deletion is permanent** (no undo/trash) and syncs as a removal.
- **Commenting allowed regardless of completion** for the current/active task instance.
- **Comment indicator** (FR-013): a small count on the collapsed row/card front to aid discovery; exact styling is a UI detail.
- **No notifications** for new comments (out of scope; could build on feature 016 later).
- **Out of scope** (confirmed): mentions, attachments, reactions, nested replies/threads.
- **Builds on**: recurrence/series (feature 009) to group earlier instances; the swipe-to-complete list interaction (feature 011); the card front/back flip (features 004/006); nucleus membership + RLS isolation (feature 008) and members/author identity (feature 012); the existing edit affordance pattern (feature 010).
