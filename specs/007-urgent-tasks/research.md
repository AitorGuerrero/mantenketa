# Phase 0 Research: Urgent Tasks
**Feature**: 007-urgent-tasks · 2026-06-15

## D1: Boolean field on the task (not a new entity)
`urgent: boolean` on Task; `urgent boolean not null default false` on
public.tasks (under existing RLS); Dexie key. Intrinsic, 1:1, must sync.

## D2: Set at creation, normalized in the parser (test-first)
`parseNewTask` yields `urgent` (boolean, default false). One definition
(Principle II); deterministic (Principle IV).

## D3: Ordering — urgent first within "ya" only
`orderYa` gains a primary key: urgent before non-urgent; then the existing rule
(dateless last, dated by date asc, createdAt). "pronto"/"hechas" untouched — the
spec floats urgent only once the time has come (the "ya" group, incl. dateless).

## D4: Dexie v4 backfills urgent=false; sync carries it
v4 upgrade sets urgent=false on existing rows (no index — not queried).
taskToRow/rowToTask + the outbox UPDATE include urgent; LWW unchanged.

## D5: Marker
A clear "Urgente" badge (distinct from the overdue red — use an accent) on every
surface a task appears: card front/back/peek and list rows, plus a subtle card
tint. Styling is a UI detail; stored data unaffected.

No NEEDS CLARIFICATION remain (creation-only + all-urgent-in-ya-float confirmed).
