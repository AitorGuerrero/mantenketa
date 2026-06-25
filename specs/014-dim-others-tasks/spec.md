# Feature Specification: Dim and block tasks assigned to someone else

**Feature Branch**: `014-dim-others-tasks`

**Created**: 2026-06-26

**Status**: Draft

**Input**: User: "Quiero que las tareas que están asignadas a otra persona,
aparezcan como que no puedo realizarlas (por ejemplo con opacidad al 50%)".
Clarified: besides dimming, **block completing them** (the swipe gesture is
disabled for those tasks).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See at a glance which tasks aren't mine (Priority: P1) 🎯 MVP

A group task **assigned to another member** (not me, not unassigned) is shown
**dimmed (50% opacity)** so it reads as "not mine to do", and its
swipe-to-complete is **disabled** — I cannot mark it done (nor revert it). It
remains visible (shared awareness). My own tasks, unassigned group tasks and
personal tasks are unaffected.

**Acceptance Scenarios**:

1. **Given** a group task assigned to another member, **When** it is shown (list row or deck card), **Then** it appears at 50% opacity.
2. **Given** such a task in the list, **When** I try to swipe it right, **Then** nothing happens (it is not completed).
3. **Given** such a task on the deck card, **When** I swipe right or press "Hecha", **Then** it is not completed (the action is disabled).
4. **Given** a task assigned to me, unassigned, or personal, **When** it is shown, **Then** it is at full opacity and fully actionable (unchanged).

### Edge Cases

- **Reassigned to me / unassigned**: it returns to full opacity and becomes actionable.
- **Deferring on the deck** (Posponer / swipe left) stays allowed — it only reorders my session, it does not complete the task.
- **Editing** is out of scope here (not changed by this feature).

## Requirements *(mandatory)*

- **FR-001**: A group task whose `assigneeId` is set and is **not** the current user MUST be shown at reduced opacity (≈50%) wherever it appears (list rows, deck card).
- **FR-002**: For such tasks the **complete** action MUST be disabled — list swipe-to-done/revert does nothing, and the deck "Hecha" button + swipe-to-done are disabled.
- **FR-003**: Tasks assigned to me, unassigned group tasks and personal tasks MUST be unchanged (full opacity, fully actionable).
- **FR-004**: Deferring on the deck (Posponer / swipe left) MAY stay enabled (it does not complete the task).

## Success Criteria *(mandatory)*

- **SC-001**: A task assigned to another member is visually distinct (dimmed) and cannot be marked done by the current user.
- **SC-002**: No change to completing/reverting one's own, unassigned, or personal tasks.
