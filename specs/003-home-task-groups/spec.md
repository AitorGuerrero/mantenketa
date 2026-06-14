# Feature Specification: Home Refactor — Grouped Task Lists & Create Button

**Feature Branch**: `003-home-task-groups`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Refactorizar la pantalla principal (home) para agrupar las tareas en listas separadas en lugar de una sola lista: (1) tareas «para hacer ya» (sin fecha y vencidas hoy o antes), con las de días pasados resaltadas; (2) tareas «para hacer pronto» (fecha futura) ordenadas por fecha; (3) últimas tareas realizadas. Y un botón «Nueva tarea» que abre el formulario de creación en lugar de tenerlo siempre visible."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See tasks grouped by urgency (Priority: P1) 🎯 MVP

When the user opens the app, instead of a single list they see their tasks
organised into three meaningful groups so they can tell at a glance what needs
doing now, what is coming up, and what they have recently finished:

1. **Para hacer ya** — tasks with no date plus tasks whose date is today or
   earlier. Tasks dated in the past (overdue) are visually highlighted so they
   stand out.
2. **Para hacer pronto** — tasks dated in the future, ordered by date
   ascending (soonest first).
3. **Hechas recientemente** — the most recently completed tasks, newest first.

**Why this priority**: This is the core value of the refactor — turning one
flat list into an at-a-glance triage view. It delivers the whole benefit on its
own, independently of how tasks are created.

**Independent Test**: With a mix of tasks (some without date, some overdue,
some due today, some in the future, some completed), open the app and confirm
each task appears in the correct group, overdue tasks are highlighted, the
"pronto" group is in ascending date order, and completed tasks appear in the
"hechas" group newest first.

**Acceptance Scenarios**:

1. **Given** a task with no date, **When** the user views the home, **Then** it appears in "Para hacer ya".
2. **Given** an outstanding task dated before today, **When** the user views the home, **Then** it appears in "Para hacer ya" and is visually highlighted as overdue.
3. **Given** an outstanding task dated today, **When** the user views the home, **Then** it appears in "Para hacer ya" and is NOT highlighted as overdue.
4. **Given** outstanding tasks dated in the future, **When** the user views the home, **Then** they appear in "Para hacer pronto" ordered by date ascending (soonest first), and not in "Para hacer ya".
5. **Given** completed tasks, **When** the user views the home, **Then** the 5 most recently completed appear in "Hechas recientemente" (newest completion first) and none appear in the other two groups.
6. **Given** a group has no tasks, **When** the user views the home, **Then** that group shows a brief empty hint (or is omitted) and the other groups still render correctly.
7. **Given** an overdue task in "Para hacer ya", **When** the user marks it done, **Then** it leaves "Para hacer ya" and appears at the top of "Hechas recientemente".
8. **Given** a completed task in "Hechas recientemente", **When** the user reverts it, **Then** it leaves that group and reappears in "Para hacer ya" or "Para hacer pronto" according to its date.

---

### User Story 2 - Create a task from a button (Priority: P2)

The task-creation form is no longer permanently on screen taking up space.
Instead the user taps a **"Nueva tarea"** button that reveals the creation
form; after saving a task, or cancelling, the form closes again and the home
returns to the grouped lists.

**Why this priority**: Reclaims screen space for the grouped lists (especially
on a phone) and makes creating a task a deliberate action. It depends on US1
being the new home layout but is a distinct, separately testable interaction.

**Independent Test**: From the home, confirm no creation form is visible until
the "Nueva tarea" button is tapped; tapping it shows the form; saving a valid
task adds it to the right group and closes the form; cancelling closes the form
without creating anything.

**Acceptance Scenarios**:

1. **Given** the home, **When** it loads, **Then** the creation form is not shown and a "Nueva tarea" button is visible.
2. **Given** the home, **When** the user taps "Nueva tarea", **Then** the creation form appears (with the existing name, date and — when in a nucleus — scope fields).
3. **Given** the form is open, **When** the user saves a valid task, **Then** the task is created, the form closes, and the task appears in the correct group.
4. **Given** the form is open, **When** the user cancels, **Then** the form closes and no task is created.
5. **Given** the form is open with an invalid entry (e.g. blank name), **When** the user tries to save, **Then** the existing validation message is shown and the form stays open.

---

### Edge Cases

- A task dated today sits in "Para hacer ya" but is not highlighted; only strictly past dates are highlighted as overdue.
- The day boundary uses the device's local current date; a task that was "today" becomes "overdue" once the local date rolls over (the grouping re-evaluates on next view/render).
- "Hechas recientemente" is limited to the most recent completed tasks; older completed tasks beyond the limit are not shown on the home (no full history view is in scope).
- Completed tasks never appear in "ya"/"pronto" regardless of their date.
- Nucleus and personal tasks are grouped by the same date rules; scope (personal/nucleus) does not change which group a task falls into, and existing nucleus indicators/authorship still show.
- With no tasks at all, the home shows empty hints and the "Nueva tarea" button.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The home MUST present tasks in three distinct groups — "Para hacer ya", "Para hacer pronto", and "Hechas recientemente" — instead of one combined list.
- **FR-002**: "Para hacer ya" MUST contain every outstanding task that has no date or whose date is today or earlier.
- **FR-003**: Within "Para hacer ya", tasks whose date is strictly before today (overdue) MUST be visually distinguished from the rest.
- **FR-004**: "Para hacer pronto" MUST contain every outstanding task whose date is after today, ordered by date ascending (soonest first).
- **FR-005**: "Hechas recientemente" MUST contain completed tasks ordered by completion date descending (most recently completed first), limited to a small recent set (see Assumptions).
- **FR-006**: A task MUST appear in exactly one group at any time, determined by its completion state and date relative to the device's current local date.
- **FR-007**: Each group MUST handle being empty gracefully (a brief empty hint or omission of the group) without breaking the others.
- **FR-008**: The creation form MUST NOT be shown by default; a "Nueva tarea" button MUST be present to open it.
- **FR-009**: Opening the form via the button MUST present the existing creation fields (name, optional date, and scope when the user belongs to a nucleus).
- **FR-010**: Saving a valid task MUST create it (unchanged from current behaviour), close the form, and place the task in the correct group; cancelling MUST close the form without creating anything.
- **FR-011**: All existing task behaviour MUST be preserved: creation validation, marking done, reverting, completion-date and completing-member display, personal vs nucleus scope, and live updates across devices/members.
- **FR-012**: Marking a task done or reverting it MUST move it to the correct group immediately, reflecting the change without a manual reload.

### Key Entities

- **Task** *(unchanged)*: No new fields. Grouping is derived at view time from the existing `date` (or its absence), completion state, and completion date, compared against the device's current local date. This feature adds no persisted data and no schema change.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is stored and readable on the device?**
Unchanged — all tasks (personal and nucleus) remain readable locally. The
grouping is a presentation of that same local data plus the device's current
date; it works fully offline.

**What happens to writes?**
Unchanged — creating, completing and reverting tasks are local-first writes
queued for sync exactly as today. This feature changes only how existing tasks
are displayed and how the creation form is opened; it introduces no new writes.

**Conflict-resolution rule on sync:**
N/A — no new writable entity. Existing per-task last-write-wins is unaffected.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can identify what needs doing now versus later in a single glance, with overdue tasks visibly distinct, without scrolling past completed items.
- **SC-002**: Every task appears in exactly one of the three groups, matching its date and completion state, with zero miscategorised tasks across a representative mix.
- **SC-003**: The home opens with no creation form visible, and a task can be created in under 20 seconds from tapping "Nueva tarea" to seeing it in its group.
- **SC-004**: Marking a task done (or reverting it) moves it to the correct group within one second, with no manual reload.
- **SC-005**: All feature 001/002 behaviours continue to pass their existing tests (no regression in create, complete, revert, scope, or sync).

## Assumptions

- **Three groups, not two**: the original request mentioned "2 listas" but described three; this spec implements the three described groups ("ya", "pronto", "hechas recientemente").
- **"Hechas recientemente" limit**: shows the most recent **5** completed tasks (newest first) — confirmed with the user. A full completed-history view is out of scope.
- **"Hacer ya" internal order**: dateless ("hacer ya") tasks first, then dated tasks by date ascending (most overdue → today). Overdue (strictly past) tasks are highlighted.
- **Day boundary**: "today", "overdue" and "future" are computed against the **device's local calendar day** (no time-of-day), consistent with feature 001's calendar-day granularity. This reintroduces overdue detection, which feature 001 deferred.
- **Completion-date tiebreak**: completed tasks sharing a completion date are ordered by most-recently-changed first.
- **Form presentation**: opening the form via the button may be inline or as an overlay; the spec only requires that it is hidden by default and closes on save/cancel.
- **No data changes**: no new persisted fields, no migration; grouping is derived at render time.
