# Phase 0 Research: Recurring Tasks

Decisions for adding recurrence on top of the existing local-first + Supabase
stack. No new services; one small build-time dependency.

## Decision 1: Materialize-on-completion (no occurrence/RRULE engine)

**Decision**: Keep exactly one open instance per series. Completing it leaves
that row completed and inserts one new pending row for the next date. No future
occurrences are pre-created; no stored RRULE evaluated lazily.

**Rationale**: Matches the app's to-do/deck UX (one card at a time), preserves
"Hechas recientemente" as real history, and is far simpler than a recurrence
engine (Principle VII). Local-first friendly: the successor is just another task
row that syncs normally.

**Alternatives considered**: (a) Store an RRULE + compute virtual occurrences —
needs a calendar UI the app doesn't have and lazy expansion logic. (b) Re-open
the same row (clear completedAt, advance date) — loses completion history and
breaks "Hechas recientemente". Both rejected.

## Decision 2: Recurrence shape — frequency + interval + anchor

**Decision**: `recurrence = { freq: 'daily'|'weekly'|'monthly'|'yearly',
interval: integer ≥ 1, anchor: 'completion'|'dueDate' }`, or `null` for one-off.
No weekday/month-day rule sets this phase.

**Rationale**: Covers the household-maintenance cases ("cada 3 meses", "cada
semana") and fixed-calendar ones ("el día 1 cada mes") with a tiny, fully
testable model. Weekday sets (Mon/Thu) add real complexity and are explicitly
out of scope per the spec.

**Alternatives considered**: iCalendar RRULE subset — overkill for one household.

## Decision 3: Next-date computation (pure function, test-first)

**Decision**: `nextOccurrenceDate(base: 'YYYY-MM-DD', rec): 'YYYY-MM-DD'`.
- daily → base + interval days
- weekly → base + 7·interval days
- monthly → add `interval` calendar months
- yearly → add `interval` calendar years
Month/year arithmetic **clamps** to the last valid day when the target month is
shorter (Jan 31 +1 month → Feb 28/29; Feb 29 +1 year → Feb 28). Computed in UTC
using the same YYYY-MM-DD discipline as `domain/date.ts` (no timezone drift).

**Base date by context**:
- complete, anchor `completion` → the completion day (today)
- complete, anchor `dueDate` → the instance's scheduled `taskDate`
- skip, anchor `completion` → today; skip, anchor `dueDate` → current `taskDate`

**Rationale**: Pure and deterministic ⇒ unit-testable (Principle IV, SC-002).
Clamping is the least-surprising rule and matches common calendar apps.

**Alternatives considered**: Rolling overflow (Jan 31 → Mar 3) — surprising and
drifts; rejected.

## Decision 4: Deterministic successor identity (cross-device dedup)

**Decision**: The successor task id = `uuidv5(`${seriesId}:${nextDate}`, NS)`
with a fixed namespace UUID constant. `seriesId` is assigned when the task is
first created as recurring (a fresh UUID; the root instance stores its own
`seriesId`). All instances of the series share `seriesId`.

**Rationale**: Two devices completing the same instance (e.g. both offline) each
generate the **same** successor row id, so on sync last-write-wins merges them
into one — no duplicate next task (FR-007, SC-003). Content-addressed identity is
the simplest way to make generation idempotent across devices without
coordination.

**Implementation note**: Use the standard `uuid` package's synchronous `v5`
(SHA-1 based). Justified single dependency (Principle VII): `crypto.randomUUID`
cannot produce deterministic ids, and `crypto.subtle.digest` is async (would push
async into the domain). Added at one call site in `domain/recurrence.ts`.

**Alternatives considered**: A non-UUID deterministic string — rejected, the
`tasks.id` column is `uuid`. Hand-rolled SHA-1 — more code/risk than the library.

## Decision 5: Generation wired into the repository, not the pure transition

**Decision**: `domain/completion.ts` (`markDone`/`revert`) stays pure and only
changes completion state. The successor INSERT (and its removal on revert) lives
in `taskRepository.markDone`/`revert`, inside the existing rw transaction with
the outbox enqueue. `skipOccurrence(id)` and `stopRecurrence(id)` are new
repository methods (plain task UPDATEs).

**Rationale**: Side-effecting multi-row writes belong in the data layer; the
domain stays pure/testable. Reuses the existing transaction + outbox + LWW
stamping path, so sync "just works".

**Revert rule (FR-008b)**: On reverting a recurring completion, recompute the
successor id (`seriesId` + the next date from the reverted completion/base) and
delete that row **iff** it still exists and is pending (`completedAt === null`).
If the successor was already completed or modified, leave it. Heuristic: "pending
and present" approximates "untouched" at single-household scale.

## Decision 6: Skip and stop as in-place updates

**Decision**:
- **Skip**: advance the current row's `taskDate` to `nextOccurrenceDate(baseForSkip)`,
  keep it pending (no `completedAt`), stamp `updatedAt`. Same id — the series
  continues with one open instance.
- **Stop ("no repetir más")**: set `recurrence = null` on the current row, keep
  date/content, stamp `updatedAt`. Completing it later spawns nothing.

**Rationale**: Both are ordinary single-row task writes resolved by LWW; no new
rows, no special sync. Keeps the "one open instance per series" invariant.

## Decision 7: Persistence & sync of recurrence

**Decision**: Add `recurrence jsonb` (nullable) and `series_id uuid` (nullable)
to `public.tasks`. `mapping.ts` maps `recurrence` ↔ the typed object and
`series_id` ↔ `seriesId`. The outbox UPDATE payload includes both. Dexie bumps to
**v6** backfilling `recurrence = null`, `seriesId = null` (no index needed).

**Rationale**: Additive columns; RLS, Realtime and the pull query are unchanged
(the successor is a normal task row, filtered by the existing policies). The
`tasks_guard` trigger still forbids changing `owner_id`/`nucleus_id` and enforces
LWW; changing `task_date`/`recurrence` on skip/stop is allowed; the successor is
an INSERT, so the update guard does not apply to it.

**Alternatives considered**: Separate `recurrence` table keyed by series — more
joins/policies for no benefit at this scale; rejected.

## Decision 8: Presentation

**Decision**: A cadence badge ("cada 3 meses", "cada semana", "cada día",
"cada 2 años"…) via a pure `cadenceLabel(recurrence)`, shown next to the urgent
and group badges in `TaskBody`. Skip and "no repetir más" appear as small
actions on recurring tasks: in the list under the item, and on the deck card.
Mobile-first; verified at a narrow viewport.

**Rationale**: Consistent with the existing badge system; minimal new UI.
