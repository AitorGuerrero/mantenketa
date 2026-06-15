# Implementation Plan: Multiple Groups per User

**Branch**: `008-multi-nucleus` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-multi-nucleus/spec.md`

## Summary

Lift the "one nucleus per user" constraint introduced in feature 002 and let a
signed-in user belong to many independent **groups** (Casa, Viaje, Trabajo…) at
once. Each group keeps its own members, invitations and tasks; isolation stays
enforced by RLS. The home shows personal tasks and the tasks of every group the
user belongs to **merged together, each labeled with its scope** (Personal or
the group name) — no "active group" switcher. New tasks default to personal; the
user explicitly picks one group to share.

Technical approach: this is mostly a **generalization of existing code**, not new
machinery. The single hard constraint is the `UNIQUE (user_id)` on
`memberships`; removing it plus turning the scalar RLS helper `my_nucleus_id()`
into a set-returning `my_nucleus_ids()` and dropping the `already_in_nucleus`
guards in the two RPCs unlocks N-group membership at the data layer. On the
client, the single cached nucleus (`NUCLEUS_KEY` → `NucleusView`) becomes a
cached **list** of groups (`GroupView[]`), the create-task scope picker lists
"Personal" + one entry per group, and the task badge shows the owning group's
name. Pull (`select('*')`) and the single Realtime channel already work because
RLS does the filtering — they need no change beyond the new helper.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), React 18, Vite 8

**Primary Dependencies**: Dexie (IndexedDB), @supabase/supabase-js (Postgres+RLS,
Auth Google SSO, Realtime), Zod v4, vite-plugin-pwa

**Storage**: Browser IndexedDB (Dexie) as the read/write source of truth; Supabase
Postgres as the sync/sharing backend (one project, production)

**Testing**: Vitest (unit + RLS isolation against linked Supabase), Playwright (e2e)

**Target Platform**: Installable PWA on Cloudflare Workers static assets; mobile-first

**Project Type**: Web app (single `apps/web` package in a pnpm workspace)

**Performance Goals**: Local reads/writes instant (IndexedDB); online group-task
changes visible to other members within 5 s via Realtime

**Constraints**: Offline-capable for all task reads/writes; group-management
actions (create/invite/accept/leave) online-only with a clear offline message;
free-tier only

**Scale/Scope**: Single household → handful of users, each in a handful of groups;
tens of tasks per group. No pagination needed at this scale.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Local-First** — PASS. Task reads/writes stay local-first; the cached group
  list is read from Dexie meta. Group management remains online-only with offline
  messaging (unchanged from 002). Offline Behavior section in spec is complete.
- **II. One Language, One Type System** — PASS. TypeScript strict only. The
  `Group`/`GroupView` types are defined once; Supabase row types are regenerated
  from the schema after the migration and mapped at the one existing boundary
  (`sync/mapping.ts`, `nucleusService` refresh). All SQL stays in
  `supabase/migrations`.
- **III. Spec Before Code** — PASS. spec.md + this plan.md merge before code.
- **IV. Test-First for Domain Logic** — PASS. The changed domain logic (scope
  selection → which group a task belongs to; group-name labeling/lookup) gets
  failing unit tests first. RLS isolation tests proving a non-member cannot read a
  group's tasks AND that a user can belong to ≥2 groups MUST pass before the
  feature is complete (Principle VIII).
- **V. Cheap by Default** — PASS. No new services; same Supabase free tier.
- **VI. Single Deployable Environment** — PASS. One Supabase project, one
  Cloudflare deploy from main; the migration runs against the single project.
- **VII. Simplicity Over Framework Magic** — PASS. Generalizes existing functions
  in place (scalar→set helper, single cache→list cache); no new abstraction layer.
  The group selector is a plain `<select>`.
- **VIII. Tenant-Ready Data Model** — PASS. Ownership unchanged (tasks carry
  `owner_id` + nullable `nucleus_id`); isolation stays in RLS. The helper becomes
  set-returning so a user's visibility spans all their groups; isolation tests are
  mandatory.
- **IX. Mobile-First UI** — PASS. Group selector and groups panel designed at a
  narrow viewport first; verified before done.

**Result**: PASS — no violations, Complexity Tracking not required.

## Project Structure

### Documentation (this feature)

```text
specs/008-multi-nucleus/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── groups.md
├── checklists/
│   └── requirements.md  # from /speckit-specify
└── tasks.md             # /speckit-tasks output (later)
```

### Source Code (repository root)

```text
apps/web/
├── src/
│   ├── domain/
│   │   ├── task.ts                 # NewTaskInput: target group id (null=personal); default personal
│   │   └── task.test.ts            # unit: scope selection → nucleusId
│   ├── data/
│   │   ├── db.ts                   # Dexie v5: GROUPS_KEY cache of GroupView[] (meta only; no store change)
│   │   ├── nucleusService.ts       # → observeGroups()/refreshGroups()/currentGroupIds(); per-group invite/accept/leave
│   │   ├── taskRepository.ts       # createTask uses chosen group id (validated by RLS), not currentNucleusId()
│   │   └── sync/
│   │       ├── mapping.ts          # unchanged 1:1 nucleus_id mapping
│   │       └── syncEngine.ts       # unchanged (RLS filters pull + realtime)
│   ├── components/
│   │   ├── CreateTaskForm.tsx      # scope <select>: Personal + one option per group
│   │   ├── TaskItem.tsx            # badge shows owning group's NAME (not generic "Núcleo")
│   │   ├── TaskGroups.tsx          # memberName/groupName lookups across all cached groups
│   │   └── GroupsPanel.tsx         # (was NucleusPanel) list all my groups; create always available
│   └── pages/
│       └── InvitationPage.tsx      # accept into the token's group; refresh group list
├── tests/
│   ├── e2e/
│   │   ├── groups-multi.spec.ts    # NEW: belong to 2 groups, labels, scoped create, leave-one
│   │   ├── nucleus-invite.spec.ts  # generalized (still passes)
│   │   └── nucleus-tasks.spec.ts   # generalized (group label)
│   └── integration/
│       ├── rls-nucleus.test.ts     # generalized: 2 memberships allowed; cross-group isolation
│       └── rls-personal.test.ts    # unchanged
supabase/migrations/
└── 20260615130000_multi_group.sql  # drop UNIQUE(user_id); my_nucleus_ids() setof; policies use IN; RPCs drop already_in_nucleus
```

**Structure Decision**: Existing single-package web app under `apps/web`. No new
directories. The dominant changes are one SQL migration, the
`nucleusService` cache (single→list), the create-task scope picker, and the task
label. Terminology in user-facing strings shifts from "núcleo" to "grupo";
internal column/field name `nucleus_id` is kept to avoid a churny rename
(documented in research.md).

## Complexity Tracking

No constitution violations — section intentionally empty.
