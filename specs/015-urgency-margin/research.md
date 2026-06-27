# Phase 0 Research: Urgency Margin

**Feature**: 015-urgency-margin · 2026-06-27

No external unknowns; all decisions are internal modelling choices, resolved
below.

## D1 — Represent urgency as a margin, not a stored flag

- **Decision**: Replace `Task.urgent: boolean` with `Task.urgencyMargin: number
  | null` — a non-negative integer count of **whole days**; `null` ⇒ no urgency
  (never urgent).
- **Rationale**: The spec makes urgency time-based and computed. A single
  nullable integer captures every case (margin 0 = "ya mismo"/at due date,
  margin N = N days later, null = never) without a second boolean. Whole days
  match the app's date-based `taskDate` and the existing `daysBetween` unit.
- **Alternatives**: (a) keep `urgent` and add `urgencyMargin` alongside — two
  fields for one concept, violates Principle II and the spec's "replace". (b)
  Store a precomputed `urgentFrom` date — duplicates derivable info and drifts
  when `taskDate` changes. Rejected.

## D2 — Compute urgency from the reference date with `daysBetween`

- **Decision**: `isUrgent(task, today)` (pure):
  `margin !== null && daysBetween(reference, today) >= margin`, where
  `reference = task.taskDate ?? localDay(task.createdAt)`.
- **Rationale**: `today >= reference + margin` is algebraically
  `daysBetween(reference, today) >= margin`, so we reuse the existing tested
  `daysBetween` (date.ts) and need no date-addition helper. `today` is already
  the device's local day (`todayIsoDate`), injected for determinism — same
  pattern as overdue detection. Future references give a negative diff ⇒ not
  urgent, which is correct.
- **Alternatives**: adding `addDays` then string-comparing — more surface, same
  result. Rejected.

## D3 — Reference date for dateless tasks = local creation day

- **Decision**: For a task with no `taskDate`, the reference is the **local
  calendar day** of `createdAt`, via a new `localDay(iso)` in date.ts (mirrors
  `todayIsoDate` but for an arbitrary instant).
- **Rationale**: `createdAt` is normalized to UTC-Z; slicing its UTC date could
  be off by one near midnight relative to the local `today`. Deriving the local
  day keeps "created today, margin 1 ⇒ urgent tomorrow" exact in the user's
  timezone, consistent with how `today` is computed.
- **Alternatives**: `createdAt.slice(0,10)` (UTC) — simpler but timezone-skewed
  by up to a day. Rejected for correctness.

## D4 — Surface urgency on `TaskInGroup`, not on the task

- **Decision**: `groupTasks` computes `isUrgent` once per task and exposes it on
  `TaskInGroup` (next to `isOverdue`); `orderYa` floats urgent-first using it;
  components read `group.isUrgent` instead of `task.urgent`.
- **Rationale**: Components must not each re-derive "today". The grouping layer
  already owns `today` and already decorates tasks with derived `isOverdue`;
  urgency is the same shape of derived per-render fact. Single computation site.
- **Alternatives**: components call `isUrgent(task, todayIsoDate())` themselves —
  scatters the date source and recomputes. Rejected.

## D5 — Migration preserves existing urgency

- **Decision**: Backfill `urgencyMargin = urgent ? 0 : null` (Dexie v9 upgrade
  and the SQL migration), then drop `urgent`.
- **Rationale**: Margin 0 reproduces feature-007 behaviour exactly — a dated
  urgent task stays urgent at/after its due date; a dateless urgent task (ref =
  creation day, in the past) stays urgent now. Non-urgent tasks get `null` and
  never auto-become urgent. Matches the spec's migration mapping.
- **Alternatives**: leave `urgent` in place — contradicts the spec's replace and
  leaves a dead column. Rejected.

## D6 — Form control

- **Decision**: Keep the "Urgente" toggle; when on, reveal a small numeric
  "días" field (default 0) labelled by context — "tras la fecha" when a date is
  set, "tras crearla (0 = ya mismo)" when dateless. Toggle off ⇒ `urgencyMargin
  = null`; on ⇒ the entered non-negative integer (empty ⇒ 0).
- **Rationale**: Preserves the familiar 007 affordance and the "ya mismo"
  meaning as margin 0, while adding the delay with one field. Mobile-first, no
  new component. Exact copy/styling is a UI detail.
- **Alternatives**: a bare number field with no toggle — less discoverable and
  loses the explicit "off = never urgent" state. Rejected.

## Unchanged

Marker visuals (badge + tint on card front/back, peek, list rows), grouping
membership, overdue detection, completion/revert, scope, and RLS are all
unchanged. Urgent tasks remain, by construction, only within "Para hacer ya"
(reference ≤ urgency day, and dateless tasks already live in "ya").
