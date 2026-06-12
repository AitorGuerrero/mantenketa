<!--
SYNC IMPACT REPORT
==================
Version change: 2.1.0 → 3.0.0
Bump rationale: MAJOR — backward-incompatible foundation change. The app is
  redefined as local-only and single-person to start (data in browser IndexedDB,
  no backend, no sync, no auth). The Supabase backend is removed from the current
  stack and deferred to a future multi-device/multi-user phase.

Redefined principles:
  - Principle I:    Offline-First → Local-First (device is source of truth; no
      backend/sync until later)
  - Principle II:   removed Edge Functions / SQL / packages-shared mandates;
      TypeScript-only, with SQL rules deferred until a backend exists
  - Principle IV:   removed RLS / Supabase-config test clauses
  - Principle V:    reworded — zero cost in the local-only phase; free/usage
      tiers apply when a backend is added
  - Principle VI:   Single Deployable Environment → Cloudflare Pages only
      (Supabase project reference removed)
  - Principle VIII: Tenant-Ready Data Model → DEFERRED; activates only once a
      backend / multi-user persistence is introduced (owner column dropped for now)

Unchanged principles:
  - III. Spec Before Code; VII. Simplicity Over Framework Magic

Other changes:
  - Technology Stack rewritten: PWA + IndexedDB (Dexie) local store on Cloudflare
    Pages; backend = none (Supabase named as the intended future backend)

Templates:
  - .specify/templates/plan-template.md  — ✅ no change needed (generic gate)
  - .specify/templates/spec-template.md  — ⚠ Offline Behavior prompts still apply
      but answers are now "local-only / N-A until backend"; no structural change
  - .specify/templates/tasks-template.md — ✅ no change needed

Deferred TODOs: none

----------------------------------------------------------------------
Prior amendments:
  2.0.0 → 2.1.0 (MINOR): added Principle VIII (Tenant-Ready Data Model).
  1.0.0 → 2.0.0 (MAJOR): removed AWS entirely; adopted Supabase + Cloudflare Pages.
-->

# Mantenketa Constitution

## Core Principles

### I. Local-First

All application data lives on the user's device and the app MUST be fully usable
— reading and writing — with no network connection. In the current phase there
is no backend; the device is the source of truth. When a backend is later
introduced it MUST sync local changes rather than replace local storage, and
each feature MUST define a per-entity conflict-resolution strategy at that time.

Every feature spec MUST include an **Offline Behavior** section that answers:
1. What data is stored and readable on the device?
2. What happens to writes (and, once a backend exists, how are they queued for sync)?
3. How are conflicts resolved on sync? (Answer "N/A — no backend yet" until one exists.)

A feature spec that omits this section MUST NOT be merged.

**Rationale**: Mantenketa is consulted in garages, basements, and away from
Wi-Fi. Local-first means the app never depends on connectivity to function; a
backend, when added, is an enhancement for multi-device/multi-user use, not a
prerequisite.

### II. One Language, One Type System

TypeScript (strict) is the only language in the codebase. Each domain type and
its validation schema is defined once and reused; duplicate definitions of the
same domain concept are PROHIBITED. `any` is PROHIBITED outside verified
external-library boundaries; every exception MUST carry an inline comment
explaining why a safe type is impossible.

When a backend is later introduced, any SQL it requires MUST be confined to a
single versioned migrations directory, and database row types MUST be generated
from the schema rather than hand-duplicated.

**Rationale**: A single language and one definition per domain type eliminate
whole classes of drift bugs. Confining future SQL to a versioned boundary keeps
that contract explicit and reviewable when the time comes.

### III. Spec Before Code (NON-NEGOTIABLE)

No feature implementation begins until both `spec.md` and `plan.md` for
that feature are merged to the main branch. This rule applies to all work,
including hot-fixes. Hot-fixes require a minimal spec (user story + acceptance
scenario) and a one-section plan (approach + risk) — brevity is permitted,
skipping is not.

**Rationale**: Undocumented decisions become invisible technical debt. The
spec-before-code rule ensures every change is intentional, reviewable, and
traceable regardless of urgency.

### IV. Test-First for Domain Logic (NON-NEGOTIABLE)

Unit tests MUST be written and confirmed failing before implementation code
is added for: recurrence calculation, overdue detection, and state-transition
logic. The Red step of Red–Green–Refactor is non-negotiable for these areas.
UI components and configuration code are exempt from test-first but MUST still
have tests before a feature is considered complete.

**Rationale**: Recurrence and overdue logic are the core value of the app;
correctness bugs here directly harm users. Test-first ensures the behaviour
is specified as executable documentation before a single line of
implementation is written.

### V. Cheap by Default

The product MUST run within free or usage-based tiers with no fixed monthly
floor. In the current local-only phase running cost is zero — a static site plus
on-device storage. When a backend is later added, only services billed per-use
or offering a permanent free tier sufficient for a single household are
**Allowed** (e.g. Supabase, Cloudflare Pages). **Forbidden**: dedicated/always-on
compute, reserved or provisioned capacity, managed services with a minimum
monthly charge, and any paid add-on not required to ship.

A service outside the allowed category, or any move to a paid plan, requires a
written ADR explaining why no free-tier or usage-based alternative exists and
estimating monthly cost at expected scale.

**Rationale**: Mantenketa is a personal/family app. Running cost should be
effectively zero at low usage. Every always-on or minimum-charge service would
add a fixed monthly floor regardless of traffic.

### VI. Single Deployable Environment

Only a single environment exists: one Cloudflare Pages production deployment fed
from the `main` branch. A separate production/staging environment — and any
backend environments introduced later — is added only when a second household
begins using the app. Until that threshold is crossed, investing in
multi-environment infrastructure (blue/green, canary, environment-specific
alarms) is PROHIBITED. Cloudflare Pages preview deployments for pull requests
are permitted because they are free and require no extra infrastructure.

**Rationale**: Premature environment complexity adds maintenance overhead
with no user-facing benefit while the app has a single household as its
audience.

### VII. Simplicity Over Framework Magic

Prefer explicit code to heavy abstractions. Generic base classes, plugin
systems, decorator-driven DI, and premature DDD layers are PROHIBITED unless
a concrete abstraction has at least two distinct call sites that demonstrably
benefit from it. Any new abstraction MUST be justified in the PR description
with the two use sites named.

**Rationale**: The entire codebase is maintained by one person. Every
opaque layer is a future debugging burden. Readable, explicit code outlasts
clever indirection.

### VIII. Tenant-Ready Data Model (DEFERRED — activates with a backend)

This principle is DORMANT in the current local-only, single-person phase: local
data does NOT carry an owner identifier. It ACTIVATES the moment a backend or any
multi-user / multi-device persistence is introduced. At that point, every
persisted entity MUST carry an owner identifier from the first backend migration,
existing local data MUST be assigned an owner via a one-time backfill, and
multi-tenant isolation MUST be enforced in the data layer (e.g. RLS) rather than
in application code alone.

**Rationale**: While the app is single-person and local, an owner column is dead
weight (Principle VII). The forward-compatibility concern is real but bounded:
the move to multi-user is planned work that will add the column and backfill the
single existing owner in one controlled step.

## Technology Stack

These choices are binding for all features unless amended via governance.

**App**: Vite · React · TypeScript (strict) · Vitest · Playwright — an
installable **PWA**, hosted on **Cloudflare Pages** (production from `main`; PR
preview deployments allowed).

**Local storage**: Browser **IndexedDB** (via a thin wrapper such as Dexie) is
the sole data store in the current phase. The device is the source of truth.

**Backend**: **None in the current phase.** When multi-device/multi-user is
specced, the intended backend is **Supabase** (Postgres, Auth, Storage,
Realtime); adopting it will be a constitution amendment with its own plan and ADR.

**Package manager**: pnpm (workspaces-ready; a shared package is introduced only
once a second consumer exists — Principle VII).

Deviations from this list require a written ADR and a constitution amendment.

## Governance

This constitution supersedes all other project norms, conventions, and
individual preferences. Any planned decision that would violate a principle
MUST be surfaced at the Constitution Check gate in `plan.md` and resolved
before implementation starts — not after.

**Amendment procedure**:
1. Open a PR that modifies `.specify/memory/constitution.md`.
2. State the rationale (why the principle must change, not just what changes).
3. Increment `CONSTITUTION_VERSION` per semantic versioning:
   - **MAJOR** — principle removal, redefinition, or backward-incompatible
     governance change.
   - **MINOR** — new principle or materially expanded guidance added.
   - **PATCH** — wording clarification, typo fix, non-semantic refinement.
4. Update `LAST_AMENDED_DATE` to today's date (ISO 8601).
5. Update any templates that reference the changed principles.
6. Merge only after the Sync Impact Report is complete and accurate.

All PRs and spec reviews MUST verify compliance with each Core Principle.
Violations caught at review rather than at the Constitution Check gate are
process failures and MUST be noted for retrospective discussion.

**Version**: 3.0.0 | **Ratified**: 2026-05-16 | **Last Amended**: 2026-06-07
