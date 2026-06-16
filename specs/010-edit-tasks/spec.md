# Feature Specification: Edit Tasks

**Feature Branch**: `010-edit-tasks`

**Created**: 2026-06-16

**Status**: Draft

**Input**: User description: "Editar tareas: una tarea ya creada se puede editar (nombre, fecha incl. quitarla, descripción, urgente y el patrón de recurrencia), reutilizando el formulario de creación en modo edición abierto desde la propia tarea; guardar refleja en local y sincroniza (LWW); cancelar descarta; conserva completado, ámbito y serie; mismas validaciones que crear."

## Clarifications

### Session 2026-06-16

- Q: ¿Qué campos se pueden editar; en concreto el ámbito (personal/grupo)? → A: Solo contenido (nombre, fecha, descripción, urgente) y el patrón de recurrencia; el **ámbito es inmutable** (no se mueve entre personal/grupo).
- Q: ¿Se puede editar el patrón de recurrencia? → A: Sí (activar/desactivar repetir y cambiar cada N / frecuencia / ancla).
- Q: ¿Qué tareas se pueden editar? → A: Solo **pendientes**; las completadas hay que revertirlas primero.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit a pending task's details (Priority: P1)

A person opens a pending task they created (or a pending task of one of their
groups) and edits its details — fix a typo in the name, set or clear the date
(clearing it makes it "hacer ya"), adjust the description, or toggle "urgente".
They use the same form they know from creating a task, now pre-filled with the
current values. Saving updates the task in place immediately; cancelling leaves
it exactly as it was.

**Why this priority**: Being unable to fix a task after creating it is a basic
gap; correcting name/date/description/urgent is the everyday need and delivers
the whole value on its own.

**Independent Test**: Create a task "Compra", open its edit control, change the
name to "Comprar pan", set a date, toggle urgent, save. Confirm the task now
shows the new name, date and urgent marker, in the right group/order, with no
duplicate created. Repeat and cancel: nothing changes.

**Acceptance Scenarios**:

1. **Given** a pending task, **When** the user opens its "Editar" control, **Then** an edit view appears pre-filled with the task's current name, date, description and urgent state.
2. **Given** the edit view, **When** the user changes fields and saves, **Then** the same task (same identity) is updated with the new values, reflected immediately in the list/deck and re-ordered if needed; no new task is created.
3. **Given** a task with a date, **When** the user clears the date and saves, **Then** the task becomes "hacer ya" and moves to that group.
4. **Given** the edit view with changes, **When** the user cancels, **Then** the task is left unchanged.
5. **Given** an edit with a blank name (or an invalid date), **When** the user tries to save, **Then** the change is rejected with the same validation message as creation and the task is not modified.

---

### User Story 2 - Edit the recurrence of a task (Priority: P2)

From the same edit view, the user can turn repetition on or off and change its
cadence — frequency, "every N", and whether the next date counts from completion
or from the due date. A task that wasn't recurring can become recurring, and a
recurring one can stop repeating. The new pattern applies from then on: the next
occurrence generated when the task is completed uses the updated cadence.

**Why this priority**: Recurrence was previously fixed at creation; people get
the cadence wrong or want to change it. It reuses US1's edit view and the
existing recurrence machinery.

**Independent Test**: Edit a non-recurring task to "cada 2 semanas", save, and
confirm the cadence badge appears; edit again to disable repetition and confirm
the badge disappears and completing it creates no successor.

**Acceptance Scenarios**:

1. **Given** a non-recurring pending task, **When** the user enables repetition with a cadence and saves, **Then** the task becomes recurring (a new series) and shows its cadence; completing it later generates the next occurrence with that cadence.
2. **Given** a recurring pending task, **When** the user changes the cadence (frequency/interval/anchor) and saves, **Then** the updated pattern is stored and the next generated occurrence uses it.
3. **Given** a recurring pending task, **When** the user disables repetition and saves, **Then** it becomes a one-off and completing it creates no successor.
4. **Given** the user sets the anchor to "en la fecha prevista" but the task has no date, **When** they try to save, **Then** it is rejected with the same message as creation (a date is required for that anchor).

---

### User Story 3 - Shared edits and the pending-only rule (Priority: P3)

When a member edits a group task, the change becomes visible to all members of
that group, just like creating or completing one; personal tasks stay private to
their owner. Only pending tasks can be edited — a completed task shows no edit
control, so to change it the user reverts it to pending first.

**Why this priority**: It defines the collaboration and the boundary of the
feature; it builds on US1 and the existing sync/RLS.

**Independent Test**: With two members of a group, one edits a shared task's name
and the other sees the new name within seconds without reloading. A completed
task offers no "Editar"; after reverting it, the control appears.

**Acceptance Scenarios**:

1. **Given** two online members of a group, **When** one edits a shared task, **Then** the other sees the change within seconds without reloading, and members of other groups see nothing.
2. **Given** a personal task, **When** its owner edits it, **Then** no other user can ever see it or the change.
3. **Given** a completed task, **When** the user looks at it, **Then** there is no edit control; **When** they revert it to pending, **Then** the edit control becomes available.

---

### Edge Cases

- **Offline edit**: editing works offline; the change is written locally and queued, syncing on reconnect (last-write-wins by most recent change).
- **Concurrent edits**: two members edit the same group task at almost the same time → the most recent change wins; no duplicate and no lost identity.
- **Reorder on edit**: changing the date, clearing it, or toggling urgent re-places the task in the correct group/order immediately.
- **Recurrence edit on a recurring task**: changing the pattern affects the next generated occurrence (it is copied from the edited instance on completion); already-completed past instances are unaffected.
- **Enable recurrence**: turning a one-off into a recurring task starts a new series; turning it off detaches it from repetition.
- **Edit available in both views**: the edit control is reachable both in the list and in the card/deck (touch).
- **Validation parity**: blank name and invalid date are rejected exactly as in creation; a save with no changes is a harmless no-op.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to open an edit view for a pending task from the task itself (an "Editar" control).
- **FR-002**: The edit view MUST reuse the creation form's controls, pre-filled with the task's current values (name, date, description, urgent, recurrence).
- **FR-003**: The editable fields MUST be: name, date (including clearing it → "hacer ya"), description, the urgent flag, and the recurrence pattern (enable/disable; frequency; interval "every N"; anchor). The task's scope (personal vs a specific group) MUST NOT be editable.
- **FR-004**: Saving MUST apply the same validation as creation (non-blank name; valid date; the "due date" recurrence anchor requires a date) and, on success, update the task locally immediately and queue the change for sync, stamping the last-write-wins clock.
- **FR-005**: Saving MUST preserve the task's identity, completion state, owner and scope/group, and its recurring-series membership; it MUST NOT create a new task.
- **FR-006**: Cancelling MUST discard all changes and leave the task unchanged.
- **FR-007**: Only pending (not completed) tasks MUST be editable; a completed task MUST NOT present the edit control.
- **FR-008**: For a group task, an edit MUST become visible to all members of that group while online without a manual reload; a personal task and its edits MUST remain visible only to the owner.
- **FR-009**: Enabling recurrence on a non-recurring task MUST start a new series; disabling it MUST make the task a one-off; changing the pattern MUST take effect for the next generated occurrence.
- **FR-010**: The edit control MUST be available wherever a pending task is shown (list view and card/deck view).
- **FR-011**: Concurrent edits to the same task MUST resolve by last-write-wins, consistent with all other task writes; completion remains idempotent.

### Key Entities *(include if feature involves data)*

- **Task** *(unchanged shape, from features 001/002/007/008/009)*: editing mutates its existing mutable fields — name, date, description, urgent, recurrence (and series id when recurrence is first enabled). Identity, owner, scope, completion state and created-at are not changed by an edit; the updated-at clock is stamped.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is readable offline?**
Unchanged: all tasks the device has last seen (personal and group), with their
current values. Editing reads and writes the local store.

**What writes are queued locally?**
Editing a task (name, date, description, urgent, recurrence) is written locally
first and queued for sync, exactly like create/complete/skip/stop. No edit
requires connectivity.

**Conflict-resolution rule on sync:**
Per task, last-write-wins by most recent change time: a later edit replaces an
earlier concurrent one. Editing does not change ownership or scope, so it cannot
create cross-tenant conflicts; completion stays idempotent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can change any editable field of a pending task and see it reflected (and re-ordered if needed) in the list/deck within 1 second locally.
- **SC-002**: An edit to a group task is visible to other online members within 5 seconds without reloading.
- **SC-003**: Editing preserves identity, completion state, scope and series — zero new tasks created and zero scope/owner changes across an edit.
- **SC-004**: Invalid edits (blank name; "due date" anchor without a date) are rejected with the same message as creation and leave the task unchanged 100% of the time.
- **SC-005**: Cancelling an edit leaves the task unchanged.

## Assumptions

- **Scope is immutable**: moving a task between personal and a group (or between groups) is out of scope (kept simple; avoids changing the ownership trigger and RLS).
- **Only pending tasks are editable**: completed tasks are edited by reverting them to pending first.
- **Recurrence pattern is editable**: enabling/disabling and changing cadence is allowed; pattern changes apply to future occurrences via the existing materialize-on-completion copy (the successor is generated from the edited instance).
- **Reuses the creation form** in an "edit mode"; no separate high-fidelity screen.
- **No per-field history/audit**: the latest edit wins; the app does not keep an edit log.
- **No backend change required**: editing only mutates already-syncable fields (name, date, description, urgent, recurrence, series id); ownership/scope are untouched, so the existing update policy and the immutability trigger remain as they are.
