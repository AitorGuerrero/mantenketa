# Feature Specification: Task Create & Complete

**Feature Branch**: `001-task-create-complete`

**Created**: 2026-06-01

**Status**: Draft

**Input**: User description: "I want to create a task with a name and a date. Then when the date arrives, I want to mark the task as done."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a task and see it in the list (Priority: P1)

A household member wants to write down something that needs doing on a specific
day (e.g. "Change kitchen filter" on 2026-06-15). They enter a name and pick a
date, and the task appears in their list of tasks showing that name and date.

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

---

### User Story 2 - Mark a task as done (Priority: P2)

When the work for a task is finished, the household member opens their list and
marks the task as done so it is clearly distinguished from what is still
outstanding.

**Why this priority**: Completing tasks closes the loop and is the second half
of the described flow, but it has no value until tasks can be created and listed
(US1).

**Independent Test**: With at least one task present, mark it done and confirm
it is shown as completed and distinguished from outstanding tasks.

**Acceptance Scenarios**:

1. **Given** an outstanding task, **When** the user marks it done, **Then** the task is shown as completed and distinguished from outstanding tasks in the list.
2. **Given** a task already marked done, **When** the user views it, **Then** it is clearly shown as completed and is not offered for completion again.
3. **Given** an outstanding task, **When** the user marks it done, **Then** the completion is recorded with the date it was completed.

---

### Edge Cases

- What happens when the user creates a task with a date in the past? → Allowed; the date is stored and displayed as-is.
- What happens when two tasks have the same name and date? → Both are kept as separate tasks; names are not required to be unique.
- What happens when the user marks an already-completed task done again? → No effect; completion is idempotent.
- How does the system handle a task created or completed while offline? → It is queued locally and reflected in the list immediately (see Offline Behavior).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to create a task by providing a name and a date.
- **FR-002**: System MUST reject task creation when the name is empty and inform the user a name is required.
- **FR-003**: System MUST reject task creation when no date is provided and inform the user a date is required.
- **FR-004**: System MUST persist created tasks so they remain available across sessions and devices for the same household.
- **FR-005**: System MUST display the list of tasks, showing each task's name, date, and completion state.
- **FR-006**: Users MUST be able to mark an outstanding task as done.
- **FR-007**: System MUST record the date a task was completed when it is marked done.
- **FR-008**: System MUST treat marking a task done as idempotent — completing an already-completed task has no further effect.
- **FR-009**: System MUST visibly distinguish outstanding tasks from completed tasks in the list.
- **FR-010**: System MUST associate every task with an owner identifier so tasks can later be isolated per household/user without re-modelling existing data (Constitution Principle VIII). In this version a single default owner is used.

### Key Entities *(include if feature involves data)*

- **Task**: A single thing to be done on a given day. Attributes: name (free text, required), date (the day it is scheduled, required), completion state (outstanding or done), completion date (the day it was marked done, set only when done), owner identifier (which household/user it belongs to).

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is readable offline?**
The full task list — every task's name, date, and completion state — is readable
offline from the last synced copy.

**What writes are queued locally?**
Creating a task and marking a task done are both performed locally and queued
for sync; they take effect in the local view immediately.

**Conflict-resolution rule on sync:**
Per task, last-write-wins by the most recent change timestamp, with one
exception: a "mark done" always takes precedence over a concurrent edit of the
same task, so a completion is never lost on sync. Since this version has a single
owner, true concurrent conflicts are expected to be rare (same user on two
devices).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a task (name + date) in under 20 seconds from opening the app.
- **SC-002**: A newly created task appears in the task list immediately, including when the device is offline.
- **SC-003**: A user can mark a task done in a single action from the task list.
- **SC-004**: A user can tell at a glance which tasks are outstanding and which are done.
- **SC-005**: 100% of tasks created or completed while offline are present and consistent after the next successful sync, with no lost completions.

## Assumptions

- **No authentication in this version**: per the constitution, V1 ships without sign-in and is used by a single household; every task still carries an owner identifier set to a single default value, so per-user/SSO spaces can be added later without data migration (Principle VIII).
- **Date granularity is a calendar day** (no time-of-day).
- **Due/overdue highlighting is out of scope** for this version; tasks display their date but the app does not flag which are due or overdue. (Deferred to a later spec.)
- **Editing and deleting tasks are out of scope** for this version; the flows covered are create, list, and mark-done.
- **Recurring tasks are out of scope** for this version; each task is a single one-off occurrence.
- **Marking done is a manual action available at any time** (before, on, or after the task's date); the date does not gate completion. "When the date arrives" is interpreted as the typical timing, not a restriction.
- **No reminders or notifications** are included in this version.
