# Feature Specification: Daily Task Summary Notification (Android)

**Feature Branch**: `016-daily-summary-notification`

**Created**: 2026-06-28

**Status**: Draft

**Input**: User description: "Aviso diario en Android (notificación local) con un resumen de tareas: nuevas, urgentes pendientes y nº de pendientes. Local sin servidor (Periodic Background Sync), hora configurable por defecto 08:00 entendida como 'a partir de'. Sin banner in-app; solo notificación Android."

## Summary

Once a day the app shows a single Android system notification summarizing the
user's tasks: how many are **new** (created since the last notification), how
many **urgent** tasks are pending, and the **total number of pending** tasks.
It is **local-only** — computed on the device from local data, with no server
and no need to be signed in. The user turns it on with a toggle and picks a
time (default **08:00**), understood as a **lower bound**: the notification
appears on the first background wake at or after that time each day. It is
**not** an exact-time alarm and works only where the platform supports periodic
background activity (installed Android PWA on Chromium-based browsers).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Turn on the daily summary and receive it (Priority: P1) 🎯 MVP

The user opens settings, switches on **"Avísame cada día"**, and grants the
notification permission when asked. From then on, once per day (at or after the
configured time, default 08:00) they receive **one** Android notification that
reads, e.g., "3 nuevas · 2 urgentes · 7 pendientes" and lists up to three urgent
task names. Tapping it opens the app. No notification appears more than once a
day, and none appears before the configured time.

**Why this priority**: It is the whole point — a once-a-day heads-up of what
needs attention, delivered by the system even when the app is closed. Delivers
value on its own.

**Independent Test**: On a supported installed Android PWA, enable the toggle,
grant permission, and (via a background-wake trigger) confirm exactly one
notification with the correct counts appears at/after the time, and a second
wake the same day produces no duplicate.

**Acceptance Scenarios**:

1. **Given** the toggle is off, **When** the user switches it on and grants permission, **Then** the daily summary becomes active and is stored so it survives app restarts.
2. **Given** it is active and the local time is at/after the configured time and no summary was shown today, **When** the device performs a background wake, **Then** one notification is shown with counts of new, urgent and pending tasks (and up to three urgent names).
3. **Given** a summary was already shown today, **When** another background wake happens the same day, **Then** no second notification is shown.
4. **Given** a notification is shown, **When** the user taps it, **Then** the app opens (focusing an existing window if one is open).
5. **Given** the user denies the notification permission, **When** enabling, **Then** the toggle stays off and the user is told permission is required.

---

### User Story 2 - Configure the time (Priority: P2)

The user changes the daily time from the default 08:00 to another time. From the
next day, the notification appears no earlier than the new time. Changing the
time takes effect without re-granting permission.

**Why this priority**: The user explicitly wants the time to be configurable; it
refines the core behaviour but the feature is usable at the default.

**Independent Test**: Set the time to a value just in the past and confirm the
next background wake shows the notification; set it to a future value and confirm
no notification is shown until that time is reached.

**Acceptance Scenarios**:

1. **Given** the daily summary is active, **When** the user sets a new time, **Then** it is stored and used as the lower bound from then on.
2. **Given** the configured time has not yet been reached today, **When** a background wake happens, **Then** no notification is shown.
3. **Given** no time was ever chosen, **When** the feature is first enabled, **Then** the time defaults to 08:00.

---

### User Story 3 - Turn it off, and behave well where unsupported (Priority: P3)

The user can switch the daily summary off and stop receiving notifications. On a
device/browser that does not support background notifications (iOS, Firefox,
desktop, or an uninstalled PWA), the setting clearly shows it is **not available**
here and nothing is promised.

**Why this priority**: Control and honesty about platform limits; not needed to
deliver the core value but important for trust.

**Acceptance Scenarios**:

1. **Given** the daily summary is active, **When** the user switches it off, **Then** no further notifications are shown and the off state is stored.
2. **Given** the browser/device cannot do background notifications, **When** the user opens the setting, **Then** it shows "no disponible en este navegador" and cannot be turned on.

---

### Edge Cases

- **First time ever**: with no previous notification recorded, the "new" count is **0** (the app does not claim every existing task is new).
- **Browser skips a day / wakes late**: the notification may arrive later than the configured time or not at all that day — accepted; at most one per day, never before the configured time.
- **App never opened as installed PWA**: no local data yet ⇒ nothing to summarize; no notification.
- **All zeros**: behaviour when there are 0 new, 0 urgent and 0 pending — the spec assumes a notification is still shown with zeros unless decided otherwise (see Assumptions).
- **Counts reflect the moment of the wake**, computed from the current local data and the current day.
- **Settings are device-local**: the toggle and time are not shared across devices or accounts.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST offer a setting **"Avísame cada día"** (on/off) plus a **time** selector; switching it on MUST request the system notification permission via a user action.
- **FR-002**: When active and supported, the system MUST show **at most one** notification per local day, **not before** the configured time, on a background wake at/after that time.
- **FR-003**: The notification content MUST include the count of **new** tasks (outstanding tasks created since the last shown summary), the count of **urgent pending** tasks, and the **total pending** count; it MAY include up to three urgent task names.
- **FR-004**: "New" MUST be defined relative to the last shown summary; on the very first run (no prior summary) the new count MUST be **0**.
- **FR-005**: The configured time MUST default to **08:00**, be changeable by the user, persist locally, and take effect without re-requesting permission.
- **FR-006**: The summary MUST be computed **locally** from on-device data and MUST NOT require a network connection or a signed-in account.
- **FR-007**: Tapping the notification MUST open the app (focusing an existing window if present).
- **FR-008**: The setting state (on/off and time) MUST persist across app restarts and MUST be **device-local** (not synced across devices/accounts).
- **FR-009**: Turning the setting off MUST stop further notifications.
- **FR-010**: On platforms that cannot deliver background notifications, the setting MUST clearly show it is **not available** and MUST NOT be enableable.
- **FR-011**: The feature MUST NOT present an in-app banner or in-app summary; the **only** delivery channel is the Android system notification.
- **FR-012**: "Pending" MUST mean tasks that are not completed; "urgent" MUST follow the app's existing urgency rule relative to the current day.

### Key Entities *(include if feature involves data)*

- **Daily-summary setting** *(new, device-local)*: whether the daily summary is enabled, and the chosen time (default 08:00). Not synced.
- **Last-summary marker** *(new, device-local)*: the timestamp of the last shown summary (to compute "new") and the day it was last shown (to ensure once-per-day). Not synced.
- **Task** *(existing, read-only here)*: source of the counts (pending = not completed; urgent per existing rule; new = created after the last-summary timestamp). This feature does not modify tasks.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is stored and readable on the device?**
The setting (on/off + time) and the last-summary marker are stored locally. The
summary itself is computed on demand from the locally stored tasks. Everything
needed is on the device; nothing is fetched.

**What happens to writes?**
The only writes are the local setting and the last-summary marker; both are
device-local and are **not** queued for sync. No task data is written.

**Conflict-resolution rule on sync:**
N/A — these settings are intentionally per-device and never synced, so there is
no cross-device conflict. (Tasks themselves continue to sync as before; this
feature only reads them.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With the feature on and the platform supported, the user receives **at most one** summary notification per day, **never before** the configured time.
- **SC-002**: The notification's three counts (new, urgent pending, total pending) match what the user would see by reviewing their tasks at that moment, 100% of the time.
- **SC-003**: A user can enable the feature and set a time in **under 1 minute**, with the permission prompt appearing only as a result of their action.
- **SC-004**: The default time is 08:00 when the user never changes it; a changed time is honoured from the next day.
- **SC-005**: Turning the feature off results in **zero** further notifications.
- **SC-006**: On an unsupported browser/device the user is clearly informed it is unavailable and is never left expecting a notification that cannot arrive.
- **SC-007**: The feature works with no account and no connectivity (airplane mode), since the summary is computed locally.

## Assumptions

- **Lower-bound time, not exact** (confirmed): the configured time is the earliest
  the notification may appear; actual delivery is whenever the platform next wakes
  the app at/after that time, and a day may be skipped. Exact-time delivery is out
  of scope (would require a server).
- **Platform**: targets installed Android PWAs on Chromium-based browsers (where
  periodic background activity exists). iOS, Firefox and desktop are unsupported
  and show the unavailable state; this is accepted.
- **No in-app digest** (confirmed): the only output is the system notification.
- **All-zeros notification**: when there are no new/urgent/pending tasks, a
  notification is still shown stating there is nothing pending. (Open to change to
  "skip when nothing to report" during planning if preferred.)
- **"New" excludes completed tasks**: only outstanding tasks created since the last
  summary count as new.
- **Device-local settings**: the toggle and time live only on the device that set
  them; using the app on another device requires enabling it there too.
- **Out of scope**: integration with the Android clock/alarm or Google Assistant
  routines (not possible for a PWA); exact-time scheduling; server push; an in-app
  banner/summary; notifying when the app has never been opened on that device.
- **Builds on existing rules**: reuses the app's definitions of "pending" (not
  completed) and "urgent" (time-based urgency relative to today).
