# Feature Specification: Task Description

**Feature Branch**: `005-task-description`

**Created**: 2026-06-14

**Status**: Draft

**Input**: User description: "Descripción opcional en las tareas. Al crear una tarea, además del nombre, la fecha opcional y el ámbito, el usuario puede añadir una descripción de texto libre opcional (varias líneas). La descripción se guarda con la tarea, se sincroniza igual que el resto de campos, y se muestra al ver la tarea (en la lista y en la tarjeta de la baraja). Es opcional."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Add a description when creating a task (Priority: P1) 🎯 MVP

When creating a task, beyond the name (and optional date/scope), the user can
type an optional free-text **description** — a few lines giving context or
detail ("filtro HEPA, el del armario de la cocina"). The task is saved with that
description, and the description is shown wherever the task is viewed (the lists
and the swipe card). Leaving it empty creates a task exactly as today.

**Why this priority**: It is the whole feature — capturing and showing extra
context on a task. It is independently testable and delivers value on its own.

**Independent Test**: Create a task with a name and a multi-line description,
confirm it is saved and the description is shown when viewing the task (list and
card), survives a reload, and that creating a task without a description behaves
exactly as before.

**Acceptance Scenarios**:

1. **Given** the creation form, **When** the user enters a name and a description and saves, **Then** the task is created and its description is stored.
2. **Given** a task with a description, **When** the user views the task list, **Then** the description is shown with the task.
3. **Given** a task with a description, **When** the task appears as a swipe card, **Then** the description is shown on the card.
4. **Given** the creation form, **When** the user saves with the description left empty, **Then** the task is created with no description and looks exactly as tasks do today (no empty description area).
5. **Given** a description spanning multiple lines, **When** the task is viewed, **Then** the line breaks are preserved.
6. **Given** a task with a description created on one device by a signed-in user, **When** another device/member syncs, **Then** the description appears there too (synced like the other fields).

---

### Edge Cases

- A very long description is stored and shown without breaking the layout (it wraps; a card may cap the visible length, see Assumptions).
- Whitespace-only description is treated as no description (not stored as content).
- Existing tasks created before this feature have no description and display unchanged.
- The description never affects grouping, ordering, overdue detection, completion, or scope.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The task-creation form MUST offer an optional multi-line **description** field in addition to name, date and scope.
- **FR-002**: A task's description MUST be persisted with the task and remain available across reloads.
- **FR-003**: The description MUST be synced for signed-in users exactly like the task's other fields (same local-first write and sync path).
- **FR-004**: When a task has a description, it MUST be shown when the task is viewed in the lists and on the swipe card.
- **FR-005**: A blank/whitespace-only description MUST result in a task with no description, indistinguishable from current tasks (no empty description shown).
- **FR-006**: Multi-line descriptions MUST preserve their line breaks when displayed.
- **FR-007**: The description MUST NOT affect any existing behaviour: grouping, ordering, overdue detection, completion/revert, personal vs nucleus scope.
- **FR-008**: Tasks without a description (including those created before this feature) MUST continue to work and display unchanged.

### Key Entities

- **Task** *(extended)*: gains an optional **description** (free text, may contain line breaks; absent/empty means none). All other attributes unchanged.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is stored and readable on the device?**
Unchanged plus the new description field: the full task — including its
description — is stored and readable locally, with or without connectivity.

**What happens to writes?**
Creating a task with a description is a local-first write queued for sync,
exactly like every other task field; no new write path.

**Conflict-resolution rule on sync:**
The description is part of the task row and follows the existing per-task
last-write-wins by `updatedAt`; no separate rule.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can add a multi-line description while creating a task and see it on the task afterwards, in under 30 seconds.
- **SC-002**: 100% of descriptions entered are preserved (content and line breaks) across reload and across devices for signed-in users.
- **SC-003**: Tasks created without a description are visually and behaviourally identical to tasks today (zero regression).
- **SC-004**: Adding/much-having a description never changes a task's group, order, or overdue state.

## Assumptions

- **Description is set at creation** in this feature; editing an existing task's description is out of scope (editing tasks is not yet a feature). Adding it later would come with a general task-edit feature.
- **Plain text**, no rich formatting/markdown; line breaks are preserved but no styling is interpreted.
- **No length limit enforced** beyond what is sensible; the UI wraps long text. On the compact swipe card the description may be visually clamped (e.g. a few lines) while the full text is available in the list view — clamping is a display choice, the stored text is complete.
- **Synced field**: description is a column on the existing task record (Principle VIII unaffected — same owner/nucleus scoping); no new entity.
- **Builds on features 001–004**: extends the same create form and task rendering (lists + card); no change to grouping/deck behaviour.
