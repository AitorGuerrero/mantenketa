# Phase 1 Data Model: Swipeable Cards for "Para hacer ya"

**Feature**: 004-swipe-cards · **Date**: 2026-06-14

**No persisted schema change.** No new fields, no Dexie bump, no migration, no
Postgres change. The deck reuses the feature-003 "Para hacer ya" set; the deck
*order* is transient, in-memory, session-only view state.

## Inputs (existing, unchanged)

- The "Para hacer ya" `TaskInGroup[]` from feature 003's `groupTasks` (membership
  + `isOverdue`). Each wraps the unchanged `Task`.

## Session view state (not stored)

```text
deferredIds: string[]   // task ids the user sent to the back this session,
                        // in defer order. Held in component state; reset on
                        // reload/unmount. Never persisted, never synced.
```

## Derived deck order (pure)

`orderDeck(yaTasks, deferredIds)` →
1. yaTasks whose id is NOT in deferredIds, in their incoming (feature-003) order;
2. followed by yaTasks whose id IS in deferredIds, in deferredIds order;
3. ids in deferredIds that are no longer in yaTasks are ignored (filtered out).

The **current card** is element 0 of the result. The cards "behind" it are the
rest (for depth/animation only).

## Actions → effects

| Action (swipe or button) | Effect |
|--------------------------|--------|
| Right / "Hecha" | `markDone(task.id)` (existing local-first write) → task leaves the "ya" set on the next live-query emission → it drops out of the deck and shows in "Hechas recientemente". |
| Left / "Posponer" | append `task.id` to `deferredIds` (in memory) → `orderDeck` moves it to the back → next card shown. No write. |
| Drag released below threshold | no state change; card snaps back. |

## Reconciliation with live updates (no extra logic)

- New / synced "ya" task → present in `yaTasks`, not in `deferredIds` → appears in
  natural position (front region). Not auto-deferred.
- Task completed elsewhere → absent from `yaTasks` → filtered out of the deck.
- A deferred task completed elsewhere → its id stays in `deferredIds` but is
  filtered out (harmless dangling id, dropped by step 3).
- Reload → `deferredIds` resets to empty → natural order restored.
