# Contract: Daily Summary Notification

**Feature**: 016-daily-summary-notification · 2026-06-28

Internal contracts only (PWA + pure functions). No external/API/RLS change.

## Pure: `buildDailySummary(tasks, today, lastSummaryAt) → DailySummary`

`today` = local `YYYY-MM-DD`; `lastSummaryAt` = ISO timestamp | `null`.

| tasks | today | lastSummaryAt | → newCount / urgentCount / pendingCount |
|---|---|---|---|
| [] | any | any | 0 / 0 / 0 |
| 2 outstanding, 1 done | T | null | 0 / (per isUrgent) / 2 |
| 3 outstanding (1 created after L) | T | L | 1 / … / 3 |
| created == lastSummaryAt | T | L | not new (strict `>`) |
| done task created after L | T | L | not counted as new (outstanding only) |

- `pendingCount` = outstanding (`!isDone`); `urgentCount` = outstanding ∧ `isUrgent(t, today)`.
- `urgentNames` = first 3 urgent outstanding names, stable order.

## Pure: `shouldNotifyNow(now, configuredTime, lastNotifiedDay) → boolean`

| now (local) | configuredTime | lastNotifiedDay | → |
|---|---|---|---|
| 07:59 | "08:00" | null | false (before time) |
| 08:00 | "08:00" | null | true (at time) |
| 09:30 | "08:00" | null | true (after time) |
| 09:30 | "08:00" | today | false (already today) |
| 09:30 | "" / bad | null | true (default 08:00) |

Invariants: never before the time; at most once per local day; default time `08:00`.

## Enable/disable flow (`notifications/dailySummaryClient.ts`)

`enableDailySummary(): Promise<'enabled' | 'denied' | 'unsupported'>`
1. `'serviceWorker' in navigator` and `'periodicSync' in (await navigator.serviceWorker.ready)` → else `'unsupported'`.
2. `await Notification.requestPermission()` (on user gesture) ≠ `'granted'` → `'denied'`.
3. `navigator.permissions.query({name:'periodic-background-sync'})` denied → `'denied'`.
4. `registration.periodicSync.register('daily-task-summary', { minInterval: 24*60*60*1000 })`; on throw → `'unsupported'`.
5. Persist `dailySummaryEnabled=true` (default `dailySummary.time="08:00"` if unset) → `'enabled'`.

`disableDailySummary()`: `periodicSync.unregister('daily-task-summary')` if present; set `dailySummaryEnabled=false`.

Panel UI mapping: `enabled` → toggle on; `denied` → toggle off + "permiso necesario";
`unsupported` → toggle off + disabled + "no disponible en este navegador".

## SW events (`sw.ts`)

- `periodicsync` (tag `daily-task-summary`) → `waitUntil(runDailySummary())` (see data-model lifecycle).
- `notificationclick` → `close()`; focus an existing window (`clients.matchAll`) or `clients.openWindow('/')`.
- Preserved from generateSW: `precacheAndRoute(self.__WB_MANIFEST)`, SPA `NavigationRoute`, `skipWaiting()` + `clientsClaim()`.

## Notification payload

`title: "Mantenketa — tu día"`, `body: "{n} nuevas · {u} urgentes · {p} pendientes"`
(+ up to 3 urgent names), `tag: "daily-task-summary"`, `icon`/`badge: /icons/icon-192.png`,
`data: { url: "/" }`.
