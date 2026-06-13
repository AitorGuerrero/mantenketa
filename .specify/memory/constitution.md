<!--
SYNC IMPACT REPORT
==================
Version change: 4.0.0 → 4.1.0
Bump rationale: MINOR — new principle added. Principle IX (Mobile-First UI)
  formalizes the standing rule that all UI is designed and built for small
  screens first and enhanced upward. No existing principle changed; no
  template changes required (the rule is a layout convention, not a gate).

----------------------------------------------------------------------
Prior report (3.0.0 → 4.0.0)
==================
Version change: 3.0.0 → 4.0.0
Bump rationale: MAJOR — backward-incompatible foundation change. The app gains
  a backend (Supabase: Postgres, Auth, Realtime) to support feature 002
  (family nucleus, invitations, sign-in). The local-only phase ends; the app
  becomes local-FIRST with sync. This is the amendment that v3.0.0 explicitly
  anticipated ("adopting it will be a constitution amendment with its own plan
  and ADR" — the plan/ADR is specs/002-family-nucleus/plan.md + research.md).

Redefined principles:
  - Principle I:    Local-First — unchanged in spirit; reworded for the backend
      era: device remains the source of truth for the UX; the backend syncs
      local changes rather than replacing local storage; per-entity conflict
      strategy is now mandatory in every spec (no more "N/A — no backend").
  - Principle II:   SQL rules ACTIVATE — all SQL confined to one versioned
      migrations directory; database row types generated from the schema.
  - Principle IV:   test clause added back — RLS policies MUST have tests
      proving cross-tenant isolation before a feature is complete.
  - Principle V:    reworded — backend exists now; only Supabase free tier /
      usage-based services allowed; no fixed monthly floor.
  - Principle VI:   Single Deployable Environment — one Cloudflare Pages
      production + ONE Supabase project (production) fed from main. PR preview
      deploys of the static app allowed; no separate staging database.
  - Principle VIII: Tenant-Ready Data Model — ACTIVATED (was deferred). Every
      persisted entity carries an owner from its first migration; existing
      local data is backfilled to its owner on first sign-in; isolation is
      enforced with RLS in the data layer.

Unchanged principles:
  - III. Spec Before Code; VII. Simplicity Over Framework Magic

Other changes:
  - Technology Stack rewritten: + Supabase (Postgres, Auth with SSO, Realtime),
    supabase-js client, versioned SQL migrations under supabase/migrations.

Templates:
  - .specify/templates/plan-template.md  — ✅ no change needed (generic gate)
  - .specify/templates/spec-template.md  — ✅ Offline Behavior prompts now
      require real sync/conflict answers (template already asks them)
  - .specify/templates/tasks-template.md — ✅ no change needed

Deferred TODOs: none

----------------------------------------------------------------------
Prior amendments:
  2.1.0 → 3.0.0 (MAJOR): pivot to local-only single-person phase; Supabase
    removed from current stack and deferred; Principle VIII made dormant.
  2.0.0 → 2.1.0 (MINOR): added Principle VIII (Tenant-Ready Data Model).
  1.0.0 → 2.0.0 (MAJOR): removed AWS entirely; adopted Supabase + Cloudflare Pages.
-->

# Mantenketa Constitution

## Core Principles

### I. Local-First

All application data lives on the user's device and the app MUST be fully
usable — reading and writing — with no network connection. The device is the
source of truth for the user experience: reads come from local storage and
writes land locally first. The backend syncs local changes; it MUST NOT
replace local storage as the read path, and no user-facing task flow may
require connectivity. Account and group-management actions (sign-in, creating
a group, inviting, accepting, leaving) MAY require connectivity but MUST fail
with a clear offline message.

Every feature spec MUST include an **Offline Behavior** section that answers:
1. What data is stored and readable on the device?
2. What happens to writes, and how are they queued for sync?
3. How are conflicts resolved on sync? (A concrete per-entity strategy is now
   required — "N/A" is only acceptable for entities that cannot be written
   offline.)

A feature spec that omits this section MUST NOT be merged.

**Rationale**: Mantenketa is consulted in garages, basements, and away from
Wi-Fi. Local-first means the app never depends on connectivity to function;
the backend is an enhancement for multi-device/multi-user use, not a
prerequisite.

### II. One Language, One Type System

TypeScript (strict) is the only application language in the codebase. Each
domain type and its validation schema is defined once and reused; duplicate
definitions of the same domain concept are PROHIBITED. `any` is PROHIBITED
outside verified external-library boundaries; every exception MUST carry an
inline comment explaining why a safe type is impossible.

All SQL is confined to a single versioned migrations directory
(`supabase/migrations`); database row types MUST be generated from the schema
(e.g. `supabase gen types typescript`) rather than hand-duplicated, and the
generated types MUST be mapped into the domain types at one explicit boundary.

**Rationale**: A single language and one definition per domain type eliminate
whole classes of drift bugs. Confining SQL to a versioned boundary keeps that
contract explicit and reviewable.

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
is added for: recurrence calculation, overdue detection, state-transition
logic, and sync conflict resolution. The Red step of Red–Green–Refactor is
non-negotiable for these areas. UI components and configuration code are
exempt from test-first but MUST still have tests before a feature is
considered complete. Row-level-security policies MUST have tests proving that
one tenant cannot read or write another tenant's rows before the feature that
introduces them is complete.

**Rationale**: Recurrence, overdue, sync, and isolation logic are the core
value and the core risk of the app; correctness bugs here directly harm users.
Test-first ensures the behaviour is specified as executable documentation
before a single line of implementation is written.

### V. Cheap by Default

The product MUST run within free or usage-based tiers with no fixed monthly
floor. Only services billed per-use or offering a permanent free tier
sufficient for a single household are **Allowed** (currently: Supabase free
tier, Cloudflare Pages). **Forbidden**: dedicated/always-on compute, reserved
or provisioned capacity, managed services with a minimum monthly charge, and
any paid add-on not required to ship.

A service outside the allowed category, or any move to a paid plan, requires a
written ADR explaining why no free-tier or usage-based alternative exists and
estimating monthly cost at expected scale.

**Rationale**: Mantenketa is a personal/family app. Running cost should be
effectively zero at low usage. Every always-on or minimum-charge service would
add a fixed monthly floor regardless of traffic.

### VI. Single Deployable Environment

Only a single environment exists: one Cloudflare Pages production deployment
and one Supabase project (production), both fed from the `main` branch. A
separate staging environment — including a second Supabase project — is added
only when a second household begins using the app. Until that threshold is
crossed, investing in multi-environment infrastructure (blue/green, canary,
environment-specific alarms) is PROHIBITED. Cloudflare Pages preview
deployments for pull requests are permitted because they are free and require
no extra infrastructure; they point at the single Supabase project. Local
development MAY use a locally run Supabase instance.

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

### VIII. Tenant-Ready Data Model

Every persisted entity MUST carry an owner identifier (a user or a group)
from the first migration that creates it. Existing local data MUST be
assigned an owner via a one-time backfill on the user's first sign-in.
Multi-tenant isolation MUST be enforced in the data layer with row-level
security — never in application code alone — and those policies MUST be
covered by the isolation tests required by Principle IV.

**Rationale**: The nucleus/sharing model makes cross-tenant leakage the
single worst failure mode of the product. Enforcing ownership at the data
layer makes it impossible to forget in application code.

### IX. Mobile-First UI

All UI MUST be designed and built for the smallest screen first and enhanced
upward. Base styles (those outside any media query) ARE the mobile layout;
larger-screen adaptations are added only with `min-width` media queries.
Designing for desktop and stripping down with `max-width` queries
(graceful degradation) is PROHIBITED. Every UI change MUST be verified at a
narrow viewport before it is considered done.

**Rationale**: Mantenketa is an installable PWA used mostly on phones, in
garages and away from a desk. Small-screen-first forces content priority and
keeps the default payload light (progressive enhancement); what fits on a
phone always fits on a larger screen, but not the reverse.

## Technology Stack

These choices are binding for all features unless amended via governance.

**App**: Vite · React · TypeScript (strict) · Vitest · Playwright — an
installable **PWA**, hosted on **Cloudflare Pages** (production from `main`;
PR preview deployments allowed).

**Local storage**: Browser **IndexedDB** (via Dexie) remains the read/write
path for the UI. The device is the source of truth for the user experience.

**Backend**: **Supabase** — Postgres (with row-level security), Auth (SSO
providers; no app-managed passwords), Realtime. Accessed from the app with
`supabase-js`. All SQL lives in versioned migrations under
`supabase/migrations`; row types are generated from the schema.

**Package manager**: pnpm (workspaces-ready; a shared package is introduced
only once a second consumer exists — Principle VII).

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

**Version**: 4.1.0 | **Ratified**: 2026-05-16 | **Last Amended**: 2026-06-13
