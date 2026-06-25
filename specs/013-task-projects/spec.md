# Feature Specification: Group tasks by project

**Feature Branch**: `013-task-projects`

**Created**: 2026-06-25

**Status**: Draft

**Input**: User description: "Quiero poder agrupar las tareas por proyectos, por
ejemplo el proyecto de arreglar la cocina, que comprende hablar con el
arquitecto, llamar al ayuntamiento..."

Clarified decisions:
1. A **project is a first-class entity** (not a free-text label nor multi-tags).
   A task belongs to **0 or 1** project.
2. Projects have **personal and group scope**: a project is the user's
   (personal) or a group's (shared with its members), visible like the tasks of
   that scope. A project's tasks share its scope.
3. Surfacing is **filter + badge**: each task shows a project badge and there is
   a selector to filter by project; the current sections (ya/pronto/hechas) stay.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Put a task in a project on creation (Priority: P1) 🎯 MVP

When creating a task, the user can choose a **project** (of the chosen scope) so
related tasks ("hablar con el arquitecto", "llamar al ayuntamiento") gather under
a common goal ("Arreglar la cocina"). The task then shows a project badge.

**Acceptance Scenarios**:

1. **Given** at least one project exists in the chosen scope, **When** the user opens the create form and selects that scope, **Then** a "Proyecto" selector lists that scope's projects plus "Sin proyecto" (default).
2. **Given** a project is selected, **When** the task is created, **Then** the task is stored with that project and shows a "📁 <proyecto>" badge.
3. **Given** "Sin proyecto", **When** the task is created, **Then** it has no project and no badge.
4. **Given** the scope is switched to one without the chosen project, **When** the task is created, **Then** the project is discarded (a project only applies within its own scope).

---

### User Story 2 - Manage projects and reassign (Priority: P2)

The user can create, rename and delete projects (personal or for a group). A
task's project can be changed when editing it. Deleting a project leaves its
tasks without a project (it does not delete the tasks).

**Acceptance Scenarios**:

1. **Given** the projects panel, **When** the user creates a project with a name and scope, **Then** it appears and can be chosen on tasks of that scope.
2. **Given** a task being edited, **When** the user changes its project and saves, **Then** the task keeps its identity/scope/completion and reflects the new project.
3. **Given** a project with tasks, **When** the user deletes the project, **Then** its tasks remain but become projectless.

---

### User Story 3 - Focus on one project (Priority: P2)

A **"Proyecto" filter** narrows the home to the tasks of a chosen project,
keeping the ya/pronto/hechas sections. Group projects (and their tasks) are
visible to all members of the group.

**Acceptance Scenarios**:

1. **Given** projects exist, **When** the user picks a project in the filter, **Then** only that project's tasks are shown across the sections.
2. **Given** the filter is "Todos", **When** the home renders, **Then** all visible tasks are shown.
3. **Given** a group project, **When** another member of the group opens the app, **Then** they see the project and its tasks.

---

### Edge Cases

- **Project deleted**: `tasks.project_id` is `on delete set null`; the tasks fall back to projectless.
- **Recurring task**: the materialized successor inherits the project.
- **Offline**: assigning a task to an *existing* project works offline (it is a task field); **creating/renaming/deleting a project requires connection** (like groups).
- **Scope mismatch**: the UI only offers projects of the task's scope; a task should not point to a project of another scope.
- **Anonymous mode**: no projects (they need a session, like groups).

## Requirements *(mandatory)*

- **FR-001**: A task MAY belong to one project, chosen from projects of its scope; the create/edit form offers a "Proyecto" selector (projects of the active scope + "Sin proyecto"), defaulting to none.
- **FR-002**: Projects are an entity with **personal or group** scope; a group project (and its tasks) is visible to all members of the group, a personal one only to its owner — same visibility rules as tasks (RLS by owner/nucleus membership), without changing task ownership/scope immutability.
- **FR-003**: Users can **create, rename and delete** projects of a scope they belong to; deleting a project sets its tasks' project to null (tasks are kept).
- **FR-004**: Editing a task MAY change/clear its project, preserving identity, scope and completion.
- **FR-005**: A task's project MUST be shown wherever the task appears (list rows and deck card) as a "📁 <proyecto>" badge.
- **FR-006**: A "Proyecto" filter MUST narrow the home to one project's tasks, keeping the ya/pronto/hechas sections; offered only when projects exist.
- **FR-007**: A recurring task's successor MUST inherit the project.
- **FR-008**: Assigning a task to an existing project MUST work offline; creating/renaming/deleting projects MAY require connection.

## Success Criteria *(mandatory)*

- **SC-001**: A task put in a project shows its badge locally within 1 s; a group project and its tasks are visible to other members (after their next refresh/load).
- **SC-002**: Deleting a project never deletes tasks; affected tasks become projectless.
- **SC-003**: With a project filter active, only that project's tasks are shown.
- **SC-004**: Existing tasks (created before this feature) appear projectless and behave exactly as before.
