# Feature Specification: Recurring Tasks

**Feature Branch**: `009-recurring-tasks`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Tareas repetitivas (recurrentes) con patrón simple (frecuencia diaria/semanal/mensual/anual + intervalo «cada N»), ancla desde finalización (por defecto) o desde la fecha prevista, materializar al completar, identidad determinista de la siguiente instancia, distintivo visual, parar la serie y saltar la ocurrencia; sin patrones de días concretos de la semana; cálculo de próxima fecha como función pura testeable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete a recurring task and get the next one automatically (Priority: P1)

When creating a task the user can mark it as recurring with a simple cadence —
a frequency (daily, weekly, monthly, yearly) and an interval "every N". By
default the next occurrence is scheduled from when the task is actually
completed, so it works even for tasks with no date ("hacer ya"). When the user
marks the recurring task done, that instance stays completed (and shows in
"Hechas recientemente"), and a fresh pending instance appears automatically with
the next computed date, keeping the name, description, urgent flag and group.

**Why this priority**: This is the core of the feature — a chore you finish
reappears on schedule without re-creating it. It delivers the whole value on its
own.

**Independent Test**: Create a task "Regar plantas" recurring every 1 week
(anchor: completion), with no date. Mark it done today. Confirm the completed
one is in "Hechas recientemente" and a new pending "Regar plantas" exists with a
date one week from today, still recurring.

**Acceptance Scenarios**:

1. **Given** a new task, **When** the user marks it recurring with frequency + interval N, **Then** the task is saved as recurring with that cadence and the default anchor (from completion).
2. **Given** a pending recurring task anchored to completion, **When** the user marks it done today, **Then** that instance is completed and a new pending instance is created dated today + N·(unit), carrying name, description, urgent and group, linked to the same series.
3. **Given** a recurring task with no date, **When** it is completed, **Then** the next instance still gets a concrete next date (today + N·unit) — recurrence does not require an initial date when anchored to completion.
4. **Given** a completed recurring instance, **When** the user looks at the home, **Then** they see the completed instance under "Hechas recientemente" and the next pending instance in its normal group ("ya"/"pronto"), each correctly labeled (urgent/group as applicable).

---

### User Story 2 - Calendar-anchored recurrence (from the due date) (Priority: P2)

Some tasks must stay on a fixed calendar regardless of when they are actually
done — e.g. "pagar el alquiler el día 1 de cada mes". The user can choose to
anchor the next occurrence to the scheduled date instead of the completion date,
so the cadence does not drift if the task is completed a few days late.

**Why this priority**: Fixed-schedule obligations are common and would drift
incorrectly under completion-anchoring; this makes them correct. It builds on
US1's machinery (only the next-date base changes).

**Independent Test**: Create "Pagar alquiler" recurring monthly, anchor: due
date, dated the 1st. Complete it on the 3rd. Confirm the next instance is dated
the 1st of next month (not the 3rd).

**Acceptance Scenarios**:

1. **Given** a recurring task anchored to the due date with a scheduled date, **When** it is completed (on time or late), **Then** the next instance is dated the scheduled date + N·(unit), independent of the completion date.
2. **Given** a monthly/yearly recurrence whose next date would fall on a non-existent day (e.g. the 31st in a 30-day month, or Feb 29), **When** the next date is computed, **Then** it is clamped to the last valid day of that month.
3. **Given** the user chooses anchor "from due date" but provides no date, **When** they try to save, **Then** they are told a date is required for that anchor (from-completion has no such requirement).

---

### User Story 3 - Manage a series: skip an occurrence or stop repeating (Priority: P3)

The user can drop the current occurrence without completing it ("saltar"),
moving straight on to the next scheduled occurrence; and can end a series
entirely ("no repetir más"), after which the current task remains as a normal
one-off and no further instances are generated.

**Why this priority**: Recurring tasks need an exit and a way to skip an
irrelevant occurrence; otherwise the series is unstoppable (there is no task
editing/deleting yet). It depends on US1 existing.

**Independent Test**: With a weekly recurring task, "saltar" once and confirm the
pending instance is now dated one week later with no completion recorded; then
"no repetir más" and confirm completing it no longer creates a successor.

**Acceptance Scenarios**:

1. **Given** a pending recurring task, **When** the user skips the current occurrence, **Then** no completion is recorded, the current pending instance is replaced by the next scheduled occurrence, and the series continues.
2. **Given** a pending recurring task, **When** the user chooses "no repetir más", **Then** the task becomes a normal non-recurring task (its date and content unchanged) and completing it later creates no successor.
3. **Given** past completed instances of a series, **When** the user stops the series, **Then** those completed instances are unaffected (history preserved).

---

### Edge Cases

- **Reverting a completion**: if the user reverts (un-completes) a recurring instance whose successor was just auto-generated, the untouched pending successor is removed, so reverting does not leave two pending instances.
- **Two devices complete the same instance** (offline, then sync): both compute the same deterministic successor identity, so on sync they converge to a single next instance — no duplicates.
- **Month-end overflow**: monthly "every 1 month" from Jan 31 → Feb 28 (or 29); the day is clamped, and subsequent occurrences continue from the clamped date.
- **Skip base date**: skipping a completion-anchored task computes the next date from today (it was not completed); skipping a due-date-anchored task computes from the scheduled date.
- **Recurring group task**: the successor is created in the same group and is visible to all its members; a personal recurring task stays personal.
- **Leaving the group / group dissolved**: the series lives with the group; if the group is dissolved its recurring tasks are removed like any group task (no successor survives).
- **Offline**: creating, completing, skipping and stopping recurring tasks work offline; the successor is generated locally on completion and synced later.

## Requirements *(mandatory)*

### Functional Requirements

**Defining recurrence**

- **FR-001**: When creating a task, the user MUST be able to mark it recurring with a frequency (daily, weekly, monthly, yearly) and an integer interval N ≥ 1 ("every N").
- **FR-002**: A recurring task MUST carry an anchor: "from completion" (default) or "from due date". "From due date" MUST require the task to have a date; "from completion" MUST work with or without a date.
- **FR-003**: Recurrence is configured at creation time. After creation the only changes to recurrence are skipping the current occurrence (FR-008) and stopping the series (FR-009); editing the cadence itself is out of scope (no task editing exists).
- **FR-010**: This phase MUST NOT support weekday-specific patterns (e.g. "every Monday and Thursday"); only frequency + interval.

**Next-date calculation (pure, testable — Principle IV)**

- **FR-004**: The next occurrence date MUST be computed by a pure function: from-completion → completion date + N·(unit); from-due-date → scheduled date + N·(unit), where unit ∈ {day, week, month, year}.
- **FR-005**: When the computed date falls on a non-existent calendar day (e.g. the 31st of a 30-day month, Feb 29 in a non-leap year), it MUST be clamped to the last valid day of the target month.

**Materialize on completion**

- **FR-006**: Marking a recurring task done MUST keep that instance completed (visible in "Hechas recientemente") and create exactly one new pending instance with the next computed date, carrying over name, description, urgent flag, group/scope and the recurrence configuration, linked to the same series.
- **FR-007**: The identity of the next instance MUST be derived deterministically from the series and the next occurrence date, so that two devices completing the same instance converge to a single successor (no duplicates).
- **FR-008b**: Reverting the completion of a recurring instance MUST remove its auto-generated successor when that successor is still pending and has not been further modified, so reverting does not leave duplicate pending tasks.

**Managing a series**

- **FR-008**: The user MUST be able to skip the current occurrence without completing it: no completion is recorded, the current pending instance is replaced by the next scheduled occurrence (computed per FR-004, base date per the skip rule), and the series continues.
- **FR-009**: The user MUST be able to stop repeating a series ("no repetir más"): the current instance becomes a normal non-recurring task and no further instances are generated; previously completed instances are unaffected.

**Presentation & integration**

- **FR-011**: A recurring task MUST be visually distinguished with its cadence (e.g. "cada 3 meses"), alongside the existing urgent and group labels.
- **FR-012**: Recurring tasks MUST preserve all existing behavior: personal/group scope and visibility, urgent ordering, list/deck ordering, sync/Realtime and per-group RLS isolation. Completion stays idempotent.

### Key Entities *(include if feature involves data)*

- **Recurrence** *(value carried by a task; null ⇒ one-off)*: frequency (daily/weekly/monthly/yearly), interval N (≥1), anchor (from completion / from due date).
- **Series**: the chain of instances generated from one recurring task, identified by a shared series id; used to link an instance to its successor and to derive the deterministic successor identity.
- **Task** *(extended from features 001/002/007/008)*: gains an optional recurrence and a series id. Retains id, name, date, completion (date + member), description, urgent flag, owner and scope (personal or one group).

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is readable offline?**
All tasks the device has last seen, including recurring ones with their cadence,
series link, and the current pending instance — personal and group. The full
local feature-001 behavior is preserved for anonymous users (recurrence works
locally too).

**What writes are queued locally?**
Creating a recurring task, completing it (which also generates the successor
locally), skipping an occurrence, and stopping a series are all written locally
first and queued for sync. None of them require connectivity.

**Conflict-resolution rule on sync:**
Per task, last-write-wins by most recent change time. The successor generated on
completion uses a deterministic identity derived from series + next date, so
concurrent completions on two devices converge to a single successor instead of
creating duplicates. Skip and stop are ordinary task writes resolved by
last-write-wins. Completion remains idempotent.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Completing a recurring task makes its next pending instance appear locally within 2 seconds, with the correct next date and all carried-over attributes.
- **SC-002**: The next-date calculation is correct for daily, weekly, monthly and yearly cadences including month-end clamping (100% of the defined cases, proven by unit tests).
- **SC-003**: Two devices that complete the same recurring instance (offline, then sync) converge to exactly one next instance — zero duplicates.
- **SC-004**: After "no repetir más", completing the task creates no successor; after a skip, the pending instance advances by exactly one interval with no completion recorded.
- **SC-005**: A recurring group task's next instance is visible to the group's other online members within 5 seconds of completion, without reloading.

## Assumptions

- **Recurrence set at creation**: changing the cadence later is out of scope; only skip and stop are post-creation actions, consistent with the app having no general task editing yet.
- **One open instance per series at a time**: the materialize-on-completion model keeps a single pending instance; future occurrences are not pre-created or shown ahead.
- **Units**: weekly = 7·N days; monthly/yearly advance by calendar month/year with month-end clamping (FR-005).
- **Default anchor is "from completion"**, the common case for household maintenance and the one that supports dateless tasks; "from due date" is opt-in for fixed-calendar obligations.
- **Skip base date**: from today for completion-anchored tasks (none was completed), from the scheduled date for due-date-anchored tasks.
- **Revert window**: reverting removes the auto-generated successor only while it is still pending and unmodified; if it was already completed or edited, it is left as-is.
- **No weekday/month-day rule sets** (e.g. "1st and 15th", "Mon/Thu") in this phase.
- **Series stays with its scope**: a group recurring series is dissolved with the group; scope is not changed across instances.
