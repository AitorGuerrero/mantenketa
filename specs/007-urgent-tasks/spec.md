# Feature Specification: Urgent Tasks

**Feature Branch**: `007-urgent-tasks`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Poder marcar tareas como urgentes. Cuando haya llegado la fecha de vencimiento se ordenarán las primeras. La carta estará claramente marcada."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark a task urgent and have it surface first (Priority: P1) 🎯 MVP

When creating a task, the user can mark it **urgent**. An urgent task is clearly
marked wherever it appears (a distinct badge/highlight on its card and in the
lists). Once its time has come — i.e. it is in **"Para hacer ya"** — it is sorted
**before** the non-urgent tasks of that group, so the most pressing things are at
the top. Urgent tasks that are still in the future ("Para hacer pronto") are
marked but keep their normal date order (their due date has not arrived).

**Why this priority**: It is the whole feature — flagging the things that matter
and floating them to the top when they're due. It delivers value on its own.

**Independent Test**: Create several tasks, some urgent, with dates that have
arrived (today/overdue) and some without dates; confirm urgent ones in "Para
hacer ya" appear above the non-urgent ones and are clearly marked, while a
future urgent task is marked but stays in "Para hacer pronto" in date order.

**Acceptance Scenarios**:

1. **Given** the creation form, **When** the user marks "Urgente" and saves, **Then** the task is created as urgent.
2. **Given** urgent and non-urgent tasks in "Para hacer ya", **When** the user views the home, **Then** the urgent ones appear above the non-urgent ones in that group.
3. **Given** an urgent task anywhere it is shown (list row or swipe card), **When** the user views it, **Then** it carries a clear urgent marker distinguishing it from non-urgent tasks.
4. **Given** an urgent task whose date is in the future, **When** the user views the home, **Then** it appears in "Para hacer pronto" (marked urgent) in normal date order — it is NOT floated to the top of "ya" because its date has not arrived.
5. **Given** the creation form, **When** the user leaves "Urgente" unmarked, **Then** the task is created non-urgent and behaves exactly as today.
6. **Given** an urgent task created by a signed-in user, **When** another device/member syncs, **Then** the urgent flag appears there too.

---

### Edge Cases

- Two urgent tasks in "Para hacer ya" keep a stable order among themselves (by the existing within-group rules: dateless/overdue/today, then creation order).
- The urgent marker shows on the card front, the card back, the peek cards, and the list rows (anywhere a task is shown), so urgency is never hidden.
- Urgency does not change completion, revert, grouping membership, overdue detection, or scope — only ordering within "Para hacer ya" and the visible marker.
- A completed urgent task in "Hechas recientemente" is still marked, but urgency does not reorder completed tasks.
- Existing tasks (created before this feature) are non-urgent and display unchanged.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The creation form MUST offer an "Urgente" toggle; saving with it on creates an urgent task.
- **FR-002**: The urgent flag MUST be persisted with the task and synced for signed-in users like the other fields.
- **FR-003**: Within "Para hacer ya", urgent tasks MUST be ordered before non-urgent tasks; among urgent (and among non-urgent) the existing within-group order is preserved.
- **FR-004**: Urgency MUST NOT reorder "Para hacer pronto" (future) or "Hechas recientemente" — only "Para hacer ya".
- **FR-005**: An urgent task MUST display a clear urgent marker wherever it is shown: the swipe card (front and back), peek cards, and list rows.
- **FR-006**: Leaving the toggle off MUST create a non-urgent task identical in behaviour to tasks today; pre-existing tasks MUST be treated as non-urgent and display unchanged.
- **FR-007**: Urgency MUST NOT affect completion/revert, group membership, overdue detection, or scope.

### Key Entities

- **Task** *(extended)*: gains a boolean **urgent** (default false). No other change.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is stored and readable on the device?**
Unchanged plus the urgent flag: stored and readable locally, offline.

**What happens to writes?**
Setting urgent at creation is part of the local-first task write, queued for
sync like every other field; no new write path.

**Conflict-resolution rule on sync:**
The urgent flag is part of the task row and follows the existing per-task
last-write-wins by `updatedAt`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can mark a task urgent at creation and immediately see it marked and (if its date has come) at the top of "Para hacer ya".
- **SC-002**: In "Para hacer ya", every urgent task appears above every non-urgent task, 100% of the time.
- **SC-003**: Urgent tasks are visually distinguishable at a glance on the card and in the lists.
- **SC-004**: Non-urgent and pre-existing tasks are unchanged in behaviour and appearance; urgency never alters grouping, overdue, completion, or scope.

## Assumptions

- **Set at creation only** (confirmed): urgency is chosen with a toggle in the
  new-task form; changing it on an existing task is out of scope until a general
  task-edit feature (consistent with description/date being set-at-creation).
- **All urgent tasks in "ya" float to the top** (confirmed), including dateless
  ones — "Para hacer ya" is treated as "its time has come". Future ("pronto")
  urgent tasks are marked but not reordered.
- **Marker**: a clear, consistent visual marker (e.g. a red "Urgente" badge /
  accent) on every surface where a task appears; exact styling is a UI detail.
- **Synced boolean column** on the task (Principle VIII unaffected — same
  owner/nucleus scoping); no new entity.
- **Builds on features 003–006**: extends the create form, the grouping order
  for "ya", and the task rendering (lists + card front/back/peek).
