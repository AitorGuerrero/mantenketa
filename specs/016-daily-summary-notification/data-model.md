# Phase 1 Data Model: Daily Task Summary Notification

**Feature**: 016-daily-summary-notification · 2026-06-28

No task-schema change. New **device-local** settings in the existing Dexie `meta`
store, plus two pure derived functions. Nothing synced; no Postgres/RLS change.

## Local settings (Dexie `meta` store, `{ key, value }`) — NO schema bump

Key names centralized in `apps/web/src/notifications/keys.ts` (imported by both the
app via Dexie and the SW via raw IDB so they never drift):

| Key | Value | Meaning |
|---|---|---|
| `dailySummaryEnabled` | `boolean` | Feature on/off (default off). |
| `dailySummary.time` | `string` `"HH:MM"` | Lower-bound time; default `"08:00"`. |
| `dailySummary.lastSummaryAt` | `string` (ISO) \| `null` | Timestamp of the last shown summary; drives "new". `null` ⇒ never shown. |
| `dailySummary.lastNotifiedDay` | `string` `"YYYY-MM-DD"` \| `null` | Local day a summary was last shown; once-per-day dedupe. |

All device-local; never queued for sync (Principle VIII unaffected). `db.version`
stays at 9.

## Derived functions (`domain/dailySummary.ts`, pure — test-first, Principle IV)

```text
interface DailySummary { newCount; urgentCount; pendingCount; urgentNames: string[] }

buildDailySummary(tasks, today: string, lastSummaryAt: string | null): DailySummary
  outstanding   = tasks.filter(t => !isDone(t))
  pendingCount  = outstanding.length
  urgentCount   = outstanding.filter(t => isUrgent(t, today)).length
  newCount      = lastSummaryAt === null ? 0
                  : outstanding.filter(t => t.createdAt > lastSummaryAt).length
  urgentNames   = first 3 urgent outstanding names (stable order)

shouldNotifyNow(now: Date, configuredTime: string, lastNotifiedDay: string | null): boolean
  = localDay(now) !== lastNotifiedDay
    && clockHHMM(now) >= (parse(configuredTime) ?? "08:00")
```

- Reuses `isDone` (task.ts), `isUrgent` (urgency.ts), `localDay`/`daysBetween`
  (date.ts). `today` = `todayIsoDate()` injected.
- Malformed `configuredTime` ⇒ treat as `"08:00"`.

## Read path in the service worker (`sw/readTasks.ts`, raw IDB)

`indexedDB.open('mantenketa')` (no version) → `getAll('tasks')` → `Task[]`; plus
`getMeta(key)` / `putMeta(key, value)` over the `meta` store. No Dexie import.

## Notification content (composed in the SW from `DailySummary`)

Title e.g. "Mantenketa — tu día"; body e.g. `"{newCount} nuevas · {urgentCount}
urgentes · {pendingCount} pendientes"`, optionally appending up to 3 `urgentNames`.
`tag: 'daily-task-summary'` (collapse, never stack); `data.url = '/'` for the click
handler. Body formatting lives in the notifications layer (not the pure domain fn).

## Lifecycle (per background wake)

1. SW `periodicsync` (tag `daily-task-summary`) fires.
2. Read `dailySummaryEnabled` (bail if false), `dailySummary.time`,
   `dailySummary.lastNotifiedDay`.
3. `shouldNotifyNow(new Date(), time, lastNotifiedDay)` — bail if false.
4. `readAllTasks()`; `buildDailySummary(tasks, todayIsoDate(), lastSummaryAt)`.
5. `showNotification(...)`; set `lastNotifiedDay = today`, `lastSummaryAt = now ISO`.
