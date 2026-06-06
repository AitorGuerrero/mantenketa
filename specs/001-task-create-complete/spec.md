# Feature Specification: Task Create & Complete

**Feature Branch**: `001-task-create-complete`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "I want to create a task with a name and a date. Then when the date arrives, I want to mark the task as done."

## Clarifications

### Session 2026-06-02

- Q: Can a completed task be reverted to outstanding? → A: Yes — completion can be toggled both ways; reverting clears the completion date.
- Q: What is the default ordering of the task list? → A: Outstanding tasks first, sorted by date ascending (soonest at top); completed tasks shown below.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a task and see it in the list (Priority: P1)

The user wants to write down something that needs doing on a specific day
(e.g. "Change kitchen filter" on 2026-06-15). They enter a name and pick a date,
and the task appears in their list of tasks showing that name and date.

**Why this priority**: Capturing tasks and seeing them is the foundational value
of the app — without it there is nothing to complete or track. This single story
is already a viable product: a person can record what needs doing and when, and
review their list.

**Independent Test**: Create a task with a name and a date, then confirm it
appears in the task list showing that name and date. Fully testable with no
other story implemented.

**Acceptance Scenarios**:

1. **Given** an empty task list, **When** the user enters the name "Change filter" and the date 2026-06-15 and saves, **Then** a task "Change filter" dated 2026-06-15 appears in the list.
2. **Given** the user is creating a task, **When** they leave the name blank and try to save, **Then** the task is not created and they are told a name is required.
3. **Given** the user is creating a task, **When** they do not pick a date and try to save, **Then** the task is not created and they are told a date is required.
4. **Given** several tasks exist, **When** the user opens the app, **Then** they see all their tasks, each showing its name, date, and whether it is done.
5. **Given** several outstanding tasks with different dates, **When** the user views the list, **Then** outstanding tasks appear first ordered by date ascending (soonest at top), with completed tasks shown below.

---

### User Story 2 - Mark a task as done (Priority: P2)

When the work for a task is finished, the user opens their list and marks the
task as done so it is clearly distinguished from what is still outstanding.

**Why this priority**: Completing tasks closes the loop and is the second half
of the described flow, but it has no value until tasks can be created and listed
(US1).

**Independent Test**: With at least one task present, mark it done and confirm
it is shown as completed and distinguished from outstanding tasks.

**Acceptance Scenarios**:

1. **Given** an outstanding task, **When** the user marks it done, **Then** the task is shown as completed and distinguished from outstanding tasks in the list.
2. **Given** a task already marked done, **When** the user views it, **Then** it is clearly shown as completed and is not offered for completion again.
3. **Given** an outstanding task, **When** the user marks it done, **Then** the completion is recorded with the date it was completed.
4. **Given** a completed task, **When** the user reverts it to outstanding, **Then** it is shown as outstanding again and its completion date is cleared.

---

### Edge Cases

- What happens when the user creates a task with a date in the past? → Allowed; the date is stored and displayed as-is.
- What happens when two tasks have the same name and date? → Both are kept as separate tasks; names are not required to be unique.
- What happens when the user marks an already-completed task done again? → No effect; completion is idempotent.
- How does the system handle a task created or completed with no connectivity? → The app is local-only, so every action is stored on the device and reflected immediately regardless of network state (see Offline Behavior).
- What happens if the user clears browser/site data or switches device/browser? → Tasks live only in this browser's local storage; clearing site data or using a different browser/device starts from an empty list. (Backup/sync is deferred to a later phase.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a task by providing a name and a date.
- **FR-002**: System MUST reject task creation when the name is empty and inform the user a name is required.
- **FR-003**: System MUST reject task creation when no date is provided and inform the user a date is required.
- **FR-004**: System MUST persist created tasks on the device so they remain available across app restarts and page reloads.
- **FR-005**: System MUST display the list of tasks showing each task's name, date, and completion state, ordered with outstanding tasks first sorted by date ascending (soonest first) and completed tasks shown below.
- **FR-006**: Users MUST be able to mark an outstanding task as done.
- **FR-007**: System MUST record the date a task was completed when it is marked done.
- **FR-008**: System MUST treat marking a task done as idempotent — completing an already-completed task has no further effect.
- **FR-009**: System MUST visibly distinguish outstanding tasks from completed tasks in the list.
- **FR-010**: Users MUST be able to revert a completed task to outstanding; doing so MUST clear its completion date.

### Key Entities *(include if feature involves data)*

- **Task**: A single thing to be done on a given day. Attributes: name (free text, required), date (the day it is scheduled, required), completion state (outstanding or done), completion date (the day it was marked done — set when done, cleared when reverted to outstanding).

## Offline Behavior *(mandatory — Constitution Principle I)*

The app is **local-only** in this phase: there is no backend and no network
dependency, so it functions identically online or offline.

**What data is stored and readable on the device?**
The full task list — every task's name, date, and completion state — is stored in
the browser's local storage on the device and is always readable, with or without
connectivity.

**What happens to writes?**
Creating a task, marking it done, and reverting it are all written directly to the
device's local storage and reflected immediately. There is no sync queue because
there is no backend to sync to.

**Conflict-resolution rule on sync:**
N/A — no backend yet. With a single person on a single device there is no
concurrency to resolve. (When multi-device sync is added in a later phase, a
per-entity last-write-wins rule will be defined then.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a task (name + date) in under 20 seconds from opening the app.
- **SC-002**: A newly created task appears in the task list immediately, with or without network connectivity.
- **SC-003**: A user can mark a task done in a single action from the task list.
- **SC-004**: A user can tell at a glance which tasks are outstanding and which are done.
- **SC-005**: All tasks and their completion state persist across app restarts and page reloads with no data loss.

## Assumptions

- **Single-person, local-only**: this phase has no accounts, no backend, and no multi-device sync. All data lives in this browser's local storage on one device. Multi-user, multi-device, and backup/sync are deferred to a later phase (Constitution v3.0.0; Principle VIII dormant until a backend exists).
- **Data is scoped to the browser/device**: clearing site data, or using a different browser or device, starts from an empty list. There is no backup in this phase.
- **Date granularity is a calendar day** (no time-of-day).
- **Due/overdue highlighting is out of scope** for this version; tasks display their date but the app does not flag which are due or overdue. (Deferred to a later spec.)
- **Editing and deleting tasks are out of scope** for this version; the flows covered are create, list, and mark-done.
- **Recurring tasks are out of scope** for this version; each task is a single one-off occurrence.
- **Marking done is a manual action available at any time** (before, on, or after the task's date); the date does not gate completion. "When the date arrives" is interpreted as the typical timing, not a restriction.
- **No reminders or notifications** are included in this version.
