# Quickstart: Daily Task Summary Notification

**Feature**: 016-daily-summary-notification · 2026-06-28

## What the user gets

Once a day, an **Android system notification** like
"Mantenketa — tu día · 3 nuevas · 2 urgentes · 7 pendientes". No need to open the
app, sign in, or be online. Turn it on in settings and pick a time (default 08:00).

**Honest expectations**: the time is a *lower bound* — the notification arrives on
the first background wake at/after it, so it may be later, and the browser can skip
a day. Works only on an **installed Android PWA in Chrome/Edge**; elsewhere the
setting shows "no disponible".

## Try it (supported device: installed Android Chromium PWA, or Chrome desktop for the trigger)

1. Build + serve: `pnpm --filter @mantenketa/web build && pnpm --filter @mantenketa/web preview`
   (the custom SW needs a real build; `dev` won't run periodic sync reliably).
2. Install the PWA; open settings → toggle **"Avísame cada día"** on → grant the
   notification permission. Optionally change the time.
3. Force a wake without waiting a day: Chrome DevTools → **Application → Periodic
   Background Sync** → tag `daily-task-summary` → **Trigger**.
   - With the time in the past → one notification with the counts.
   - Trigger again same day → no duplicate.
   - Set the time to the future and Trigger → no notification.
4. Tap the notification → the app opens/focuses.

## Verify

- At most one notification per local day; never before the configured time.
- Counts match the task lists (pending = not done; urgent = current urgency rule;
  new = created since the last notification; first ever run shows 0 new).
- Works in airplane mode and signed out.
- Desktop/Firefox/iOS: the toggle shows "no disponible" and cannot be enabled.
- App still boots offline after the injectManifest migration (precache intact).

## Test commands

```bash
pnpm --filter @mantenketa/web test       # Vitest: dailySummary.test.ts (test-first)
pnpm --filter @mantenketa/web test:e2e   # Playwright: toggle/time persistence + unsupported
```

## Key files

- `src/domain/dailySummary.ts` — `buildDailySummary` + `shouldNotifyNow` (pure)
- `src/sw.ts` + `src/sw/readTasks.ts` — service worker + raw IDB read
- `src/notifications/keys.ts`, `dailySummaryClient.ts` — meta keys + enable/disable
- `src/components/NotificationsPanel.tsx` — toggle + time picker
- `vite.config.ts` — generateSW → injectManifest
