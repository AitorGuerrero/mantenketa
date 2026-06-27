# Feature Specification: Urgency Margin (time-based urgency)

**Feature Branch**: `015-urgency-margin`

**Created**: 2026-06-27

**Status**: Draft

**Input**: User description: "Quiero que las tareas tengan un atributo opcional que exprese el tiempo que tiene que pasar desde que se debe hacer hasta que empiezan a ser urgentes. Una tarea puede ser urgente desde que se crea, si se crea sin fecha y se selecciona que sea urgente ya mismo."

## Summary

Urgency stops being a static flag chosen by hand (feature 007) and becomes
**time-based and computed**. Each task may carry an optional **urgency margin** —
a grace period that runs from the task's **reference date**: its due date if it
has one, otherwise its **creation date**. The task is not urgent while inside the
margin; once the margin elapses past the reference date, the task **becomes
urgent on its own**, with no further action. So a dateless task created with a
one-day margin becomes urgent tomorrow, and **"urgente ya mismo"** is simply the
zero-margin dateless case (urgent from creation). A task with no margin is never
urgent. This replaces the manual "Urgente" toggle from feature 007.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Give a dated task a grace period before it turns urgent (Priority: P1) 🎯 MVP

When creating a task **with a due date**, the user can set an optional urgency
margin: the amount of time that must pass *after* the due date before the task
starts being urgent. While inside the margin the task behaves normally; once the
margin has elapsed the task is automatically urgent — clearly marked and sorted
to the top of **"Para hacer ya"** — without the user touching it again. A margin
of zero means the task becomes urgent exactly when its due date arrives.

**Why this priority**: This is the heart of the request — expressing "this
should be done around X, but only becomes pressing Y later" and letting urgency
emerge by itself over time. It delivers value on its own for dated tasks.

**Independent Test**: Create a task due in the past with a margin that has
already elapsed, another due in the past with a margin still running, and one
due in the past with margin 0; confirm the first and third show as urgent and
float to the top of "Para hacer ya", while the second is present in "ya" but not
urgent. Advance the date past the second task's margin and confirm it then turns
urgent on its own.

**Acceptance Scenarios**:

1. **Given** the creation form with a due date set, **When** the user sets an urgency margin and saves, **Then** the margin is stored with the task.
2. **Given** a dated task whose due date + margin is in the past, **When** the user views the home, **Then** the task is marked urgent and appears above non-urgent tasks in "Para hacer ya".
3. **Given** a dated task that is overdue but still inside its margin, **When** the user views the home, **Then** the task appears in "Para hacer ya" but is NOT urgent (no marker, not floated).
4. **Given** a dated task with margin 0, **When** its due date arrives, **Then** the task becomes urgent at that moment.
5. **Given** a task whose margin has not yet elapsed today, **When** enough time passes for the margin to elapse, **Then** the task becomes urgent automatically the next time tasks are shown, with no edit by the user.
6. **Given** a dated task created with no margin, **When** time passes well beyond its due date, **Then** the task never becomes urgent on its own.

---

### User Story 2 - Urgency margin on a dateless task, measured from creation (Priority: P2)

When creating a task **without a due date**, the user can set the same urgency
margin, which runs from the **creation date**. A dateless task with a one-day
margin becomes urgent tomorrow; a dateless task with a zero margin — **"urgente
ya mismo"** — is urgent from the moment it is created. Leaving the margin unset
creates an ordinary dateless task that is never urgent.

**Why this priority**: Lets the same time-based urgency apply to tasks with no
fixed date (the common "do this within a couple of days" case), and preserves
feature 007's "pressing right now" as the zero-margin case. Useful on its own but
secondary to the dated-task margin.

**Independent Test**: Create one dateless task with a zero margin ("urgente ya
mismo"), one with a one-day margin, and one with no margin; confirm the first is
urgent immediately, the second is non-urgent today and turns urgent once a day
has passed since creation, and the third never becomes urgent.

**Acceptance Scenarios**:

1. **Given** the creation form with no due date, **When** the user sets a zero margin ("urgente ya mismo") and saves, **Then** the task is urgent immediately on creation.
2. **Given** a dateless task created today with a one-day margin, **When** a day has passed since its creation, **Then** the task becomes urgent on its own.
3. **Given** the creation form with no due date, **When** the user leaves the margin unset, **Then** the task is created non-urgent and never becomes urgent on its own.

---

### User Story 3 - Adjust urgency on an existing task (Priority: P3)

Because tasks can already be edited (feature 010), the same urgency settings are
available when editing a task: the user can add, change, or remove the margin (or
the "urgente ya mismo" option), and urgency is re-evaluated from the new values.

**Why this priority**: Convenience and consistency with editing other fields; the
feature is usable without it (settings at creation), so it is lowest priority.

**Independent Test**: Edit an existing dated task to add a small margin that has
already elapsed and confirm it becomes urgent; edit it again to remove the margin
and confirm it stops being urgent.

**Acceptance Scenarios**:

1. **Given** an existing dated task being edited, **When** the user sets/changes/clears its margin, **Then** urgency is recomputed from the new value.
2. **Given** an existing dateless task being edited, **When** the user toggles "urgente ya mismo", **Then** its urgency changes accordingly.

---

### Edge Cases

- A task is only ever urgent at or after its reference date (margin ≥ 0), so a
  computed-urgent task is always within "Para hacer ya"; "Para hacer pronto"
  (future) never contains urgent tasks. (Dateless tasks already live in "Para
  hacer ya"; their reference date is their creation date, always in the past.)
- An overdue dated task inside its grace margin — and a dateless task whose
  creation-based margin has not yet elapsed — sits in "Para hacer ya" as a normal
  (non-urgent) task until the margin elapses.
- Two urgent tasks keep a stable order among themselves (the existing
  within-group rules: dateless/overdue/today, then creation order).
- The urgent marker shows on the card front, the card back, the peek cards, and
  the list rows — anywhere a task is shown — exactly as in feature 007.
- A margin only makes sense with a due date; the form must not let a dateless
  task carry a numeric margin (it uses "urgente ya mismo" instead), and must not
  let a dated task use "urgente ya mismo" (it uses a margin instead).
- Changing a task's due date shifts when its margin elapses, so urgency is
  recomputed against the new due date.
- A completed urgent task in "Hechas recientemente" is still marked, but urgency
  does not reorder completed tasks.
- Pre-existing tasks (including those flagged urgent under feature 007) keep their
  prior urgency after migration (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The creation form MUST offer an optional **urgency margin**: a non-negative duration that runs from the task's **reference date** — its due date if it has one, otherwise its creation date. Saving with a margin set means the task becomes urgent once that duration has elapsed past the reference date.
- **FR-002**: For a dateless task, a **zero** margin MUST mean urgent from the moment of creation; the form MAY surface this as an **"urgente ya mismo"** shortcut. A dateless task with a positive margin becomes urgent that long after its creation.
- **FR-003**: Whether a task is urgent MUST be **computed from the current date**, not stored as a fixed flag: a task is urgent when it has a margin and the current date is at or after `reference date + margin`, where the reference date is the due date if present, otherwise the creation date. A task with no margin is never urgent. A margin of 0 means urgent exactly at the reference date (due date for dated tasks, creation for dateless).
- **FR-004**: A task that is not yet urgent MUST become urgent **automatically** once its margin elapses, with no further user action, the next time tasks are evaluated/displayed.
- **FR-005**: Within "Para hacer ya", urgent tasks MUST be ordered before non-urgent tasks; among urgent and among non-urgent, the existing within-group order is preserved (consistent with feature 007).
- **FR-006**: An urgent task MUST display a clear urgent marker wherever it is shown: the swipe card (front and back), peek cards, and list rows.
- **FR-007**: The urgency settings (margin and/or the dateless "urgente ya mismo" indicator) MUST be persisted with the task and synced for signed-in users like other task fields.
- **FR-008**: This feature MUST replace the manual always-urgent boolean from feature 007: the standalone "Urgente" toggle is removed in favour of the computed model.
- **FR-009**: Pre-existing tasks MUST be migrated so their urgency is preserved and non-urgent tasks remain non-urgent (see Assumptions for the mapping).
- **FR-010**: The urgency margin MUST apply uniformly to dated and dateless tasks; the only difference is the reference date it runs from (due date vs. creation date).
- **FR-011**: Wherever task fields can already be edited (feature 010), the urgency settings MUST be editable too, with urgency recomputed from the new values.
- **FR-012**: Urgency MUST NOT affect completion/revert, group membership, overdue detection, or scope — only ordering within "Para hacer ya" and the visible marker.

### Key Entities *(include if feature involves data)*

- **Task** *(modified)*: gains a single optional **urgency margin** (a non-negative duration). It runs from the task's reference date — the due date if present, otherwise the creation date. The fixed `urgent` boolean introduced in feature 007 is removed/replaced; whether a task is urgent is **derived** from the margin and the current date. No new entity is introduced.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is readable offline?**
All tasks and the new urgency settings (margin, dateless urgent-now indicator)
are stored and readable on the device, offline. Whether a task is urgent is
computed locally from those settings and the device's current date, so urgency is
fully available offline and updates as the date advances.

**What writes are queued locally?**
Setting or changing the urgency margin / "urgente ya mismo" is part of the
local-first task write (at create or edit), queued for sync like every other
field. No new write path.

**Conflict-resolution rule on sync:**
The urgency settings are part of the task row and follow the existing per-task
last-write-wins by `updatedAt`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can give a dated task a grace period, and the task appears as urgent (marked and at the top of "Para hacer ya") on its own once the grace period elapses, without editing it.
- **SC-002**: A dateless task marked "urgente ya mismo" appears urgent immediately upon creation.
- **SC-003**: In "Para hacer ya", every urgent task appears above every non-urgent task, 100% of the time.
- **SC-004**: A task with no urgency setting never appears urgent, no matter how overdue; and every pre-existing task keeps the urgency it had before this change.
- **SC-005**: Urgent tasks are visually distinguishable at a glance on the card and in the lists.

## Assumptions

- **Replaces feature 007** (confirmed): urgency is no longer a static hand-set
  boolean; it is computed from the margin (dated tasks) or the "urgente ya mismo"
  indicator (dateless tasks). The old standalone "Urgente" toggle is removed.
- **Margin is opt-in** (confirmed): a dated task with no margin set never becomes
  urgent automatically, however overdue it is.
- **Unified reference date** (confirmed): a single margin runs from the due date
  if the task has one, otherwise from the creation date — so a dateless task
  behaves like a task whose due date is its creation date.
- **Margin unit**: whole days, consistent with the app's date-based due dates.
  Margin ≥ 0; 0 means urgent exactly at the reference date. (Finer units are out
  of scope.) "Urgente ya mismo" is the zero-margin dateless case.
- **Migration of existing tasks**: a pre-existing task flagged urgent under
  feature 007 keeps being urgent via margin 0 — for a dated task that means
  urgent at/after its due date, for a dateless task urgent from creation; tasks
  not flagged urgent get no margin (never auto-urgent).
- **Editing** reuses the existing edit-task form (feature 010); urgency settings
  are available both at creation and when editing.
- **Computed at evaluation/render time** using the device's current local date;
  no background job is required.
- **Builds on features 003–007 and 010**: extends the create/edit forms, the
  ordering for "Para hacer ya", and the task rendering (lists + card
  front/back/peek).
