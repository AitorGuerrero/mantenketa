# Phase 1 Data Model: Urgent Tasks
**Feature**: 007-urgent-tasks · 2026-06-15

One new boolean on Task.

## Domain
`Task.urgent: boolean`. `NewTaskInput.urgent?: boolean`; `parseNewTask` →
`urgent` (default false). Name/date/scope/description unchanged.

## Local (Dexie)
`db.version(4)`: no new index; `upgrade()` sets `urgent = false` on existing
rows. createTask writes urgent.

## Postgres (migration 20260615120000_task_urgent.sql)
`alter table public.tasks add column urgent boolean not null default false;`
Existing rows ⇒ false. Inherits table RLS. Types regenerated.

## Sync
taskToRow/rowToTask + outbox UPDATE include `urgent`; per-task LWW by updatedAt.

## Ordering (orderYa)
Primary: urgent before non-urgent. Secondary: existing — dateless last, dated by
date asc, createdAt asc. Applies to "Para hacer ya" only; pronto/hechas unchanged.

## Display
Urgent badge + subtle tint on the card (front/back/peek) and list rows. Tasks
with urgent=false render exactly as today.
