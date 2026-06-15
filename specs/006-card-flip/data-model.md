# Phase 1 Data Model: Flip Card

**Feature**: 006-card-flip · 2026-06-14

**No data change.** No new field, no schema, no migration, no sync change.

- Input: the existing `Task.description` (feature 005), shown on the card back.
- View state: `flipped: boolean` local to the active `TaskCard`; not persisted,
  reset when the card changes (component keyed by `task.id`).
