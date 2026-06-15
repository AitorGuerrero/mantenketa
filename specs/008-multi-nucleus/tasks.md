---
description: "Task list for feature 008 — multiple groups per user"
---

# Tasks: Multiple Groups per User

**Input**: Design documents from `/specs/008-multi-nucleus/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/groups.md, quickstart.md

**Tests**: REQUIRED — Principle IV (domain scope-selection logic is test-first) and
Principle VIII (RLS isolation across groups must be proven before the feature is complete).

**Organization**: by user story (US1 → US2 → US3) after a blocking data-layer foundation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1/US2/US3 for story-phase tasks only

---

## Phase 1: Setup & schema

**Purpose**: Generalize the backend from one nucleus per user to N groups. Blocks everything.

- [ ] T001 Write `supabase/migrations/20260615130000_multi_group.sql` and apply with `supabase db push`: drop `unique (user_id)` on `public.memberships`; replace scalar `public.my_nucleus_id()` with set-returning `public.my_nucleus_ids() returns setof uuid` (security definer, `search_path=''`); rewrite the 5 policies (`nuclei_select`, `memberships_select`, `invitations_select`, `tasks_select`, `tasks_insert` check, `tasks_update`) to use `… in (select public.my_nucleus_ids())` per contracts/groups.md; rename/edit RPCs: `create_nucleus`→`create_group` (drop `already_in_nucleus` guard), `accept_invitation` (drop global guard, keep per-group `already_member` without consuming the invite), `leave_nucleus()`→`leave_group(p_nucleus_id uuid)`
- [ ] T002 Regenerate `apps/web/src/data/database.types.ts` (`pnpm gen:types`); verify it compiles (task `nucleus_id` types unchanged)

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: Client data layer that all three stories read from. No story work begins until this is done.

- [ ] T003 Dexie **v5** in `apps/web/src/data/db.ts`: introduce meta key `GROUPS_KEY='groups'`; `db.version(5)` upgrade deletes any stale `NUCLEUS_KEY` meta entry (no `tasks` store/index change)
- [ ] T004 Generalize `apps/web/src/data/nucleusService.ts`: single `NucleusView` cache → `GroupView[]` under `GROUPS_KEY`; `refreshGroups()` builds the array from all `nuclei`+`memberships`+`invitations` rows (RLS-scoped) instead of `nuclei.data[0]`; expose `observeGroups(): Observable<GroupView[]>`, `currentGroupIds(): Promise<string[]>`, `createGroup(name)`, `createInvitation(nucleusId)`, `acceptInvitation(token)`, `leaveGroup(nucleusId)`; update `startNucleusCache` to call `refreshGroups()`

**Checkpoint**: A signed-in user's full group list is cached and observable.

---

## Phase 3: User Story 1 - Belong to several groups at once (Priority: P1) 🎯 MVP

**Goal**: A user creates and belongs to multiple independent groups; existing single nucleus is preserved as one of them.

**Independent Test**: Create two groups with different names; both appear in the list; the user is a member of both; tasks in one do not appear in the other.

### Tests for User Story 1 ⚠️ (write/confirm first)

- [ ] T005 [P] [US1] RLS isolation test in `apps/web/tests/integration/rls-nucleus.test.ts`: a user can create and hold ≥2 memberships (no `already_in_nucleus`); a member of group A who is not in group B cannot read/write B's tasks or rows
- [ ] T006 [P] [US1] e2e `apps/web/tests/e2e/groups-multi.spec.ts`: a signed-in user creates two groups, both are listed with their names, and a task created in one is not visible under the other

### Implementation for User Story 1

- [ ] T007 [US1] Rename/rework `apps/web/src/components/NucleusPanel.tsx` → `GroupsPanel.tsx`: render the list of ALL groups (`observeGroups()`) each with name + member list; keep the create-group form ALWAYS available (not only when none); call `createGroup(name)`
- [ ] T008 [US1] Wire `GroupsPanel` into `apps/web/src/App.tsx` (replace the `NucleusPanel` usage); update imports/strings

**Checkpoint**: US1 fully functional — multiple groups can be created and listed.

---

## Phase 4: User Story 2 - Unified labeled view; default personal (Priority: P2)

**Goal**: Home shows personal + all groups' tasks merged, each labeled with its scope; new tasks default to personal and the group is chosen explicitly.

**Independent Test**: A user in two groups sees personal and both groups' tasks together, each labeled; creating a task with no change yields a personal task; choosing a group yields a task labeled with that group's name.

### Tests for User Story 2 ⚠️ (write FIRST, confirm FAILING before impl)

- [ ] T009 [P] [US2] Unit tests in `apps/web/src/domain/task.test.ts`: `parseNewTask` defaults `nucleusId` to `null` (personal) when unset, and preserves a provided group id; update existing `makeTask`/scope assertions
- [ ] T010 [P] [US2] e2e in `apps/web/tests/e2e/groups-multi.spec.ts` (+ generalize `apps/web/tests/e2e/nucleus-tasks.spec.ts`): tasks show a scope label ("Personal" or the group name); default-create is personal; create-into-a-group is labeled with that group

### Implementation for User Story 2

- [ ] T011 [US2] `apps/web/src/domain/task.ts`: replace `NewTaskInput.scope` with `nucleusId: string | null` (default `null`); remove `TaskScopeSchema`/`TaskScope`; `parseNewTask` passes the id through — makes T009 pass
- [ ] T012 [US2] `apps/web/src/data/taskRepository.ts`: `createTask` writes `nucleus_id = input.nucleusId` directly (remove `currentNucleusId()` lookup)
- [ ] T013 [US2] `apps/web/src/components/CreateTaskForm.tsx`: replace personal/nucleus radios with a scope `<select>` listing "Personal" (default) + one option per group from `observeGroups()`; if no groups, offer only Personal (FR-010)
- [ ] T014 [US2] `apps/web/src/components/TaskItem.tsx` + `TaskGroups.tsx`: badge shows the owning group's NAME (add `groupName(nucleusId)` lookup across all cached groups) or "Personal", rendered only when the user belongs to ≥1 group; generalize `memberName` to search the union of all groups; styles in `apps/web/src/index.css`

**Checkpoint**: US1 + US2 work — unified labeled home with scoped creation.

---

## Phase 5: User Story 3 - Manage membership of each group independently (Priority: P3)

**Goal**: Invite/accept/leave per group, independent of other memberships; last member dissolves only that group.

**Independent Test**: Invite a second user to one group only; they accept and see only that group; leaving one group keeps the others and personal tasks intact.

### Tests for User Story 3 ⚠️ (write/confirm first)

- [ ] T015 [P] [US3] RLS test in `apps/web/tests/integration/rls-nucleus.test.ts`: accepting an invitation grants membership of that group only; leaving group A ends access to A while B stays readable; accepting an invite to a group the user is already in does not consume it (`already_member`)
- [ ] T016 [P] [US3] Generalize e2e `apps/web/tests/e2e/nucleus-invite.spec.ts`: invite to one of several groups, accept, both members see it; one user leaves that group while remaining in another

### Implementation for User Story 3

- [ ] T017 [US3] `apps/web/src/components/GroupsPanel.tsx`: per-group actions — generate invitation (`createInvitation(nucleusId)`), leave (`leaveGroup(nucleusId)`) with the last-member dissolution warning; show each group's pending invitations
- [ ] T018 [US3] `apps/web/src/pages/InvitationPage.tsx`: accept into the token's group via `acceptInvitation(token)`, then `refreshGroups()`; show the "already a member" message without consuming the invite

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & validation

- [ ] T019 [P] Replace user-facing "núcleo" strings with "grupo" across affected components; verify every changed view at a narrow mobile viewport (Principle IX)
- [ ] T020 Full validation: `pnpm test`, `pnpm test:rls`, `pnpm lint`, `pnpm build`, `pnpm test:e2e` all green; features 001–007 regression-free; run `quickstart.md` smoke; mark tasks complete

---

## Dependencies & Execution Order

- **Phase 1 (T001–T002)**: no deps; blocks everything (backend contract).
- **Phase 2 (T003–T004)**: depends on T001–T002; blocks all stories.
- **US1 (T005–T008)**: after Phase 2. MVP.
- **US2 (T009–T014)**: after Phase 2; T009 before T011; T011 before T012/T013/T014. Independent of US1.
- **US3 (T015–T018)**: after Phase 2; T017 builds on the GroupsPanel from T007.
- **Polish (T019–T020)**: after all desired stories.

### Within stories
- Tests before implementation (T009 FAILING before T011).
- Domain (T011) before its consumers (T012/T013/T014).

### Parallel opportunities
- T005/T006, T009/T010, T015/T016 are each [P] (distinct files).
- After Phase 2, US1/US2/US3 implementation can proceed in parallel (different files), except US3's panel work assumes T007's `GroupsPanel` exists.

---

## Implementation Strategy

- **MVP**: Phase 1 → Phase 2 → US1 (create/list multiple groups), validate, demo.
- **Incremental**: add US2 (unified labeled view + scoped create), then US3 (per-group invite/accept/leave).
- Existing single-nucleus data needs no migration: each current user keeps their nucleus as one group (FR-005).

## Notes

- Internal name `nucleus_id` kept on purpose (research.md Decision 8); user-facing term is "grupo".
- Sync pull + the single Realtime channel are unchanged; RLS does the per-group filtering.
- Total: 20 tasks (Setup 2, Foundational 2, US1 4, US2 6, US3 4, Polish 2).
