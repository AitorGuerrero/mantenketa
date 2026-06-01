<!--
SYNC IMPACT REPORT
==================
Version change: 2.0.0 → 2.1.0
Bump rationale: MINOR — new principle added (VIII. Tenant-Ready Data Model).
  No existing principle redefined or removed.

Added principles:
  - Principle VIII: Tenant-Ready Data Model — every persisted entity carries an
      owner/space identifier from its first migration, even while V1 has no auth

Unchanged principles:
  - I. Offline-First; II. One Language, One Type System; III. Spec Before Code;
    IV. Test-First for Domain Logic; V. Cheap by Default; VI. Single Deployable
    Environment; VII. Simplicity Over Framework Magic

Templates:
  - .specify/templates/plan-template.md  — ✅ no change needed; "Constitution
      Check" gate is generic and reads principles from this file
  - .specify/templates/spec-template.md  — ✅ no change needed
  - .specify/templates/tasks-template.md — ✅ no change needed

Deferred TODOs: none

----------------------------------------------------------------------
Prior amendment — 1.0.0 → 2.0.0 (MAJOR): removed AWS (CDK, Lambda, DynamoDB,
  Cognito, S3, CloudFront) entirely; replaced by Supabase backend + Cloudflare
  Pages hosting. Redefined Principles II (SQL allowed within supabase/migrations),
  V (cheap-by-default around free/usage tiers), VI (single Supabase project +
  Cloudflare Pages deploy); rewrote Technology Stack; npm → pnpm workspaces.
-->

# Mantenketa Constitution

## Core Principles

### I. Offline-First

The app MUST remain fully usable — reading and writing — without network
connectivity. Sync reconciles local changes with the backend on reconnect;
conflict-resolution strategy MUST be defined per entity, not globally.

Every feature spec MUST include an **Offline Behavior** section that answers:
1. What data is readable offline?
2. What writes are queued locally?
3. How are conflicts detected and resolved on sync?

A feature spec that omits this section MUST NOT be merged.

**Rationale**: Mantenketa is consulted in garages, basements, and away from
Wi-Fi. Offline-first is a core user promise, not a nice-to-have.

### II. One Language, One Type System

TypeScript is the language of all application code: the React frontend and all
Supabase Edge Functions. SQL is permitted ONLY within Supabase database
boundaries — schema migrations and Row-Level Security (RLS) policies — and MUST
live under a versioned `supabase/migrations` directory. All shared domain types
(entities, API request/response shapes, event payloads) MUST live in
`packages/shared` and be imported by both frontend and Edge Functions; database
row types MUST be generated from the Supabase schema, never hand-duplicated.
Duplicate type definitions across packages are PROHIBITED. `any` is PROHIBITED
outside verified external-library boundaries; every exception MUST carry an
inline comment explaining why a safe type is impossible.

**Rationale**: A single application language eliminates the class of bugs where
frontend and backend silently diverge on the same domain concept. SQL is
unavoidable for Postgres migrations and RLS, but it is confined to a single
versioned boundary so the contract stays explicit and reviewable. Generated row
types keep the database the single source of truth.

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
is added for: recurrence calculation, overdue detection, and state transition
logic. The Red step of Red–Green–Refactor is non-negotiable for these areas.
UI components and Supabase configuration (migrations, RLS policies, Edge
Functions) are exempt from test-first but MUST still have tests — including RLS
policy tests that prove access rules — before a feature is considered complete.

**Rationale**: Recurrence and overdue logic are the core value of the app;
correctness bugs here directly harm users. Test-first ensures the behaviour
is specified as executable documentation before a single line of
implementation is written.

### V. Cheap by Default

The MVP MUST run within free or usage-based tiers with no fixed monthly floor.
**Allowed**: Supabase (Postgres, Auth, Storage, Realtime, Edge Functions),
Cloudflare Pages, and other services billed per-use or offering a permanent
free tier sufficient for a single household.
**Forbidden**: dedicated/always-on compute, reserved or provisioned capacity,
managed services with a minimum monthly charge, and any paid add-on not
required to ship the MVP.

A service not in the allowed category, or any move to a paid Supabase /
Cloudflare plan, requires a written ADR explaining why no free-tier or
usage-based alternative exists and estimating monthly cost at expected scale.

**Rationale**: Mantenketa is a personal/family app. Running cost should be
effectively zero at low usage. Every always-on or minimum-charge service would
add a fixed monthly floor regardless of traffic.

### VI. Single Deployable Environment

Only a single environment exists: one Supabase project and one Cloudflare Pages
production deployment fed from the main branch. A separate production/staging
environment is introduced only when a second household begins using the app.
Until that threshold is crossed, investing in multi-environment infrastructure
(parallel Supabase projects, blue/green, canary, environment-specific alarms)
is PROHIBITED. Cloudflare Pages preview deployments for pull requests are
permitted because they are free and require no extra infrastructure.

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

Every persisted entity MUST carry an owner identifier column (`owner_id` /
`space_id`) from its FIRST migration, even though V1 ships with no
authentication. In V1 the column MAY be populated with a single default owner
value, but it MUST NOT be nullable-by-omission and MUST NOT be added
retroactively after rows already exist. Multi-tenant isolation in V2 MUST be
enforced through Postgres RLS policies keyed on this column (per Principle II),
never in application code alone.

**Rationale**: V1 has no auth, but V2 requires SSO and per-user/household
spaces. Retrofitting ownership onto an existing dataset is a costly, error-prone
migration with no safe automatic backfill. The column is effectively free to
add up front and makes the V2 transition a near no-op. RLS — not app code — is
the enforcement boundary because the database is the single source of truth.

## Technology Stack

These choices are binding for all features unless amended via governance.

**Frontend**: Vite · React · TypeScript (strict) · Vitest · Playwright, hosted
on **Cloudflare Pages** (production from main; PR preview deployments allowed)

**Backend**: **Supabase** — Postgres (schema + RLS), Auth, Storage, Realtime,
and Edge Functions (TypeScript/Deno). Database migrations and RLS policies live
under `supabase/migrations`; row types are generated from the schema.

**Shared**: `packages/shared` workspace — domain types, Zod schemas, utility
functions used by both frontend and Edge Functions

**Package manager**: pnpm workspaces

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

**Version**: 2.1.0 | **Ratified**: 2026-05-16 | **Last Amended**: 2026-06-01
