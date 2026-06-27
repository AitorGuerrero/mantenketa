# Contract: Derived Urgency

**Feature**: 015-urgency-margin · 2026-06-27

The internal contract this feature exposes is the pure urgency derivation in
`domain/urgency.ts`. No external/API contract changes (same task row, same RLS).

## `isUrgent(task: Task, today: string): boolean`

`today` is the device's local day (`YYYY-MM-DD`), injected for determinism.

```text
reference = task.taskDate ?? localDay(task.createdAt)
isUrgent  = task.urgencyMargin !== null
            && daysBetween(reference, today) >= task.urgencyMargin
```

### Truth table (today = 2026-06-27)

| taskDate | createdAt (local day) | margin | reference | daysBetween(ref, today) | urgent? |
|---|---|---|---|---|---|
| 2026-06-20 | — | 0 | 2026-06-20 | 7 | ✅ (≥0) |
| 2026-06-20 | — | 7 | 2026-06-20 | 7 | ✅ (=7, boundary) |
| 2026-06-20 | — | 8 | 2026-06-20 | 7 | ❌ (still in grace) |
| 2026-06-30 | — | 0 | 2026-06-30 | −3 | ❌ (date not reached) |
| 2026-06-20 | — | `null` | 2026-06-20 | 7 | ❌ (no margin = never) |
| `null` | 2026-06-27 | 0 | 2026-06-27 | 0 | ✅ ("ya mismo") |
| `null` | 2026-06-26 | 1 | 2026-06-26 | 1 | ✅ (created yesterday) |
| `null` | 2026-06-27 | 1 | 2026-06-27 | 0 | ❌ (urgent tomorrow) |
| `null` | 2026-06-27 | `null` | 2026-06-27 | 0 | ❌ (never) |

### Invariants

- `urgencyMargin = null` ⇒ never urgent, regardless of dates.
- `margin = 0` ⇒ urgent exactly when `today >= reference`.
- An urgent task is always within "Para hacer ya": its reference day is ≤ today
  (margin ≥ 0), so it is either dated-and-overdue/today or dateless (always in
  "ya"). "Para hacer pronto" never contains urgent tasks.
- Monotonic in time: once urgent, a task stays urgent on later days (the diff
  only grows), until completed/edited.

## `localDay(iso: string): string` (date.ts)

Local calendar day (`YYYY-MM-DD`) of an ISO timestamp, using the same local
getters as `todayIsoDate`. Used only to derive the creation-day reference for
dateless tasks.

## Validation (`NewTaskInputSchema`)

- `urgencyMargin`: `undefined`/`''`/`NaN` ⇒ `null`; otherwise integer ≥ 0.
  Negative or non-integer ⇒ `ValidationError`.
