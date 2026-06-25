# Feature Specification: Assign a group task to a member

**Feature Branch**: `012-assign-task-member`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Cuando se crea una tarea, si es para un grupo, se
debe poder asignar a una persona del grupo."

Clarified: assignment is **optional** (default *Sin asignar* — anyone in the
group); it can also be changed when **editing**; and beyond storing it, tasks
assigned to me are **highlighted** and can be **filtered** ("Solo mías").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assign a group task on creation (Priority: P1) 🎯 MVP

When the user creates a task and chooses a **group** as its scope, an **"Asignar
a"** selector appears listing that group's members plus **"Sin asignar"**
(default). Picking a member records them as the task's assignee; the assignee is
shown on the task ("Asignada a <persona>") wherever it appears. Personal tasks
have no assignee selector.

**Why this priority**: It is the core request — making a specific group member
responsible for a task at creation.

**Independent Test**: In a group with ≥2 members, create a task scoped to the
group, assign it to a member, and confirm the task shows "Asignada a <member>"
and the value synced to other members.

**Acceptance Scenarios**:

1. **Given** the user belongs to a group, **When** they pick that group as the task scope, **Then** an "Asignar a" selector appears with "Sin asignar" (selected) and the group's members.
2. **Given** a group is selected, **When** the user picks a member and creates the task, **Then** the task is stored with that member as assignee and displays "Asignada a <member>".
3. **Given** a group is selected, **When** the user leaves "Sin asignar" and creates the task, **Then** the task has no assignee (anyone can do it) and shows no "Asignada a" line.
4. **Given** the scope is Personal (no group), **When** the form is shown, **Then** there is no "Asignar a" selector and the task is created unassigned.
5. **Given** the scope is switched from a group back to Personal, **When** the task is created, **Then** any previously chosen assignee is discarded (assignee only applies to group tasks).

---

### User Story 2 - Reassign when editing (Priority: P2)

Editing a **group** task shows the same "Asignar a" selector (its scope is fixed
but the responsible person can change), so the assignee can be set, changed or
cleared without recreating the task.

**Acceptance Scenarios**:

1. **Given** a group task being edited, **When** the edit form opens, **Then** the "Asignar a" selector shows the group's members with the current assignee preselected.
2. **Given** the edit form, **When** the user changes the assignee and saves, **Then** the task keeps its identity/scope/completion and reflects the new assignee.
3. **Given** a personal task being edited, **When** the form opens, **Then** there is no assignee selector.

---

### User Story 3 - Spot and focus on my tasks (Priority: P2)

A group task assigned to the current user is **highlighted** ("Para mí" badge)
so it stands out in the lists and the deck. A **"Solo mías"** toggle filters the
view to the tasks that are mine — personal tasks plus group tasks assigned to me
— hiding group tasks assigned to others or unassigned.

**Acceptance Scenarios**:

1. **Given** a group task assigned to me, **When** it is shown, **Then** it carries a "Para mí" highlight (and reads "Asignada a ti").
2. **Given** the "Solo mías" toggle is on, **When** the lists render, **Then** only personal tasks and group tasks assigned to me are shown.
3. **Given** the toggle is off, **When** the lists render, **Then** all visible tasks are shown (current behavior).
4. **Given** the user belongs to no group, **When** the home renders, **Then** the toggle is not offered (everything is already personal/mine).

---

### Edge Cases

- **Assignee leaves the group / profile deleted**: the assignment clears (the column is `on delete set null`); the task falls back to unassigned.
- **Assignee no longer a member but still referenced**: the selector only offers current members; an unknown assignee id is shown via the member-name fallback.
- **Recurring task**: the materialized successor inherits the assignee.
- **Offline**: assignment is a normal local write, queued for sync like any field.
- **Anonymous mode**: no groups exist, so there is no assignment.

## Requirements *(mandatory)*

- **FR-001**: When creating a task scoped to a group, the form MUST offer an optional assignee chosen from that group's members, defaulting to "Sin asignar".
- **FR-002**: A personal (no-group) task MUST NOT have an assignee; switching scope to Personal MUST clear any chosen assignee.
- **FR-003**: The chosen assignee MUST be stored on the task and synced (a new nullable `assignee_id`), without changing task ownership/scope immutability or RLS visibility.
- **FR-004**: Editing a group task MUST allow setting/changing/clearing its assignee while preserving identity, scope and completion.
- **FR-005**: A task's assignee MUST be displayed wherever the task is shown (list rows and deck card), as "Asignada a <persona>" ("ti" for the current user).
- **FR-006**: A group task assigned to the current user MUST be visually highlighted ("Para mí").
- **FR-007**: A "Solo mías" filter MUST narrow the view to the current user's tasks (personal tasks + group tasks assigned to them); it is only offered when the user belongs to ≥1 group.
- **FR-008**: A recurring task's successor MUST inherit the assignee.

## Success Criteria *(mandatory)*

- **SC-001**: Assigning a member on creation is reflected locally within 1 s and visible to other members within 5 s via Realtime.
- **SC-002**: Changing scope to Personal never produces an assigned task.
- **SC-003**: With "Solo mías" on, no group task assigned to another member (or unassigned) is shown.
- **SC-004**: Existing tasks (created before this feature) appear unassigned and behave exactly as before.
