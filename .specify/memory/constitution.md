<!--
SYNC IMPACT REPORT
==================
Version change: (template, unpublished) → 1.0.0
Added sections: all (initial adoption)
  - Principle I:   Offline-First
  - Principle II:  One Language, One Type System
  - Principle III: Spec Before Code (NON-NEGOTIABLE)
  - Principle IV:  Test-First for Domain Logic (NON-NEGOTIABLE)
  - Principle V:   Cheap by Default
  - Principle VI:  Single Deployable Environment
  - Principle VII: Simplicity Over Framework Magic
  - Technology Stack
  - Governance
Removed sections: N/A (first version)
Modified principles: N/A (first version)

Templates:
  - .specify/templates/plan-template.md  — ✅ no change needed; "Constitution
      Check" gate is already generic and picks up principles from this file
  - .specify/templates/spec-template.md  — ⚠ UPDATED: added mandatory
      "Offline Behavior" section (required by Principle I)
  - .specify/templates/tasks-template.md — ✅ no change needed

Deferred TODOs: none
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

TypeScript is the only language used across frontend, Lambda functions, and
CDK infrastructure. All shared domain types (entities, API request/response
shapes, event payloads) MUST live in `packages/shared` and be imported by all
other packages. Duplicate type definitions across packages are PROHIBITED.
`any` is PROHIBITED outside verified external-library boundaries; every
exception MUST carry an inline comment explaining why a safe type is
impossible.

**Rationale**: A single type system eliminates the class of bugs where
frontend and backend silently diverge on the same domain concept. Shared
types are the contract; drift is caught at compile time.

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
UI components and CDK infrastructure code are exempt from test-first but MUST
still have tests before a feature is considered complete.

**Rationale**: Recurrence and overdue logic are the core value of the app;
correctness bugs here directly harm users. Test-first ensures the behaviour
is specified as executable documentation before a single line of
implementation is written.

### V. Cheap by Default

Only pay-per-request services are permitted in the MVP:
**Allowed**: Lambda, DynamoDB (on-demand), API Gateway HTTP API, S3, CloudFront.
**Forbidden**: RDS, EC2, Fargate, NAT Gateway, Elasticache, provisioned
DynamoDB capacity, and any service with a minimum hourly charge.

A service not in the allowed list requires a written ADR explaining why no
allowed alternative exists and estimating monthly cost at expected scale.

**Rationale**: Mantenketa is a personal/family app. Running cost should be
effectively zero at low usage. Every forbidden service would add a fixed
monthly floor regardless of traffic.

### VI. Single Deployable Environment

Only a `dev` stage exists. A `prod` stage is introduced only when a second
household begins using the app. Until that threshold is crossed, investing in
multi-environment infrastructure (blue/green, canary, prod-specific alarms)
is PROHIBITED.

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

## Technology Stack

These choices are binding for all features unless amended via governance.

**Frontend**: Vite · React · TypeScript (strict) · Vitest · Playwright

**Backend**: AWS CDK (TypeScript) · Lambda (Node.js, esbuild) · DynamoDB
(on-demand) · API Gateway v2 HTTP API · Cognito · S3 · CloudFront

**Shared**: `packages/shared` workspace — domain types, Zod schemas, utility
functions used by both frontend and backend

**Package manager**: npm workspaces

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

**Version**: 1.0.0 | **Ratified**: 2026-05-16 | **Last Amended**: 2026-05-16
