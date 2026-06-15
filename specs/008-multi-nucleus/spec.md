# Feature Specification: Multiple Groups per User

**Feature Branch**: `008-multi-nucleus`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "El núcleo no debe ser único: una persona puede crear y pertenecer a varios grupos a la vez (por ejemplo, uno para preparar un viaje con amigos, otro para la casa, otro para el trabajo). Cada grupo tiene sus propios miembros, invitaciones y tareas. Al crear o ver una tarea de ámbito de grupo, se elige a qué grupo pertenece. El usuario puede cambiar entre sus grupos y ver las tareas del grupo activo (además de sus tareas personales). Mantener las tareas personales como ámbito propio independiente de los grupos. Conservar el comportamiento existente de invitaciones, SSO, sync/Realtime y RLS, pero por grupo."

## Clarifications

### Session 2026-06-15

- Q: ¿Cómo se ven en la home las tareas personales y las de grupo cuando se pertenece a varios grupos? → A: Todo junto con etiqueta — se muestran a la vez las personales y las de todos los grupos; cada tarea lleva una etiqueta con su ámbito. No hay "grupo activo" ni selector de filtrado.
- Q: Al crear una tarea, ¿qué ámbito viene preseleccionado? → A: Siempre personal; el usuario elige explícitamente un grupo para compartirla.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Belong to several groups at once (Priority: P1)

A signed-in user creates more than one group — for example "Casa", "Viaje con
amigos" and "Trabajo" — and belongs to all of them at the same time. Each group
is independent: its own name, its own members, its own invitations and its own
tasks. Creating or joining a new group never forces the user to leave another.

**Why this priority**: This is the heart of the feature — lifting the
"one group per user" limit. Everything else (unified view, per-group
membership) only makes sense once a user can hold several groups at once.

**Independent Test**: A signed-in user creates two groups with different names,
confirms both exist and that they are a member of both, and that tasks created
in one do not appear in the other. Fully testable without the unified-view or
invitation refinements.

**Acceptance Scenarios**:

1. **Given** a signed-in user who already belongs to one group, **When** they create another group with a different name, **Then** they belong to both groups and neither group's tasks or members are affected by the other.
2. **Given** a signed-in user, **When** they create several groups, **Then** there is no enforced limit forcing them to leave one before creating or joining another.
3. **Given** a user who belongs to multiple groups, **When** they view the list of their groups, **Then** every group they belong to is shown with its name and member count.
4. **Given** an existing user who belonged to a single nucleus before this feature, **When** the feature is in place, **Then** that nucleus is preserved as one of their groups with all its members, invitations and tasks intact.

---

### User Story 2 - See all my tasks together, labeled by group (Priority: P2)

The home shows, in the same place, the user's personal tasks and the tasks of
every group they belong to. Each task is clearly labeled with its scope —
"Personal" or the name of the group it belongs to — so the user can tell at a
glance where each task lives, without switching views. When creating a task it
defaults to personal; to share it, the user explicitly picks one of the groups
they belong to.

**Why this priority**: This is the everyday payoff — one combined to-do across
all areas of life, with provenance visible. It depends on US1 (the groups must
exist) but delivers the value the user feels daily.

**Independent Test**: A user belonging to two groups plus personal tasks opens
the home and sees personal and both groups' tasks merged, each with its group
label; they create a task, leave the default scope, and it appears as a
personal task; they create another picking a group, and it appears labeled with
that group's name.

**Acceptance Scenarios**:

1. **Given** a user belonging to two groups with personal and group tasks, **When** they open the home, **Then** all personal and group tasks appear together, ordered by the same rules as feature 001/003/007, each task showing a label with its scope (Personal or the group's name).
2. **Given** a user creating a task, **When** they do not change the scope, **Then** the task is personal and visible only to them.
3. **Given** a user creating a task, **When** they pick one of their groups as the scope, **Then** the task belongs to that group and is visible to all of that group's members, labeled with that group's name.
4. **Given** a user who belongs to no groups, **When** they create a task, **Then** it is personal and no scope choice beyond "personal" is offered.
5. **Given** the same task shown to two members of its group, **When** both look at the home, **Then** both see the identical group label, content and completion state.

---

### User Story 3 - Manage membership of each group independently (Priority: P3)

Invitations, joining and leaving all work per group. A user invites people to a
specific group; an invited person accepts and joins only that group; a member
leaves one group without touching their other groups or their personal tasks.
When the last member leaves a group, that group and its tasks are dissolved,
leaving the user's other groups untouched.

**Why this priority**: Membership management already existed for a single
nucleus (feature 002); this story re-scopes it per group. It is essential for
collaboration but builds on US1/US2.

**Independent Test**: With two signed-in users, one creates two groups and
invites the other to just one; the second accepts and is a member of that group
only; the inviter leaves the other group and confirms it disappears for them
while the shared group remains.

**Acceptance Scenarios**:

1. **Given** a member of a group, **When** they generate an invitation for it, **Then** they obtain a single-use shareable link, valid for a limited time, that grants membership of that specific group only.
2. **Given** a signed-in user who opens a valid invitation for a group, **When** they accept it, **Then** they become a member of that group only, and their membership of any other group is unchanged.
3. **Given** a user who belongs to several groups, **When** they leave one of them after confirmation, **Then** they are removed from that group only; their personal tasks and their other groups are unaffected, and that group's tasks remain with it for the remaining members.
4. **Given** the last remaining member of a group, **When** they leave and confirm the warning, **Then** that group and its tasks are dissolved while the user's other groups remain intact.
5. **Given** members of a group editing it while online, **When** one creates, completes or reverts a task in that group, **Then** the other online members of that group see the change within seconds without reloading, and members of other groups see nothing.

---

### Edge Cases

- A user opens an invitation for a group they already belong to → they are told they are already a member; the invitation is not consumed; other memberships unaffected.
- Two groups have the same name → both are allowed; they are distinct groups, and the home may show two tasks with the same group label (they are still isolated by group identity).
- A user belongs to no group → the home shows only personal tasks and the create form offers only the personal scope (no group picker).
- Leaving one group while belonging to others → only that membership ends; tasks of the other groups and personal tasks are untouched.
- A group is dissolved (its last member leaves) → that group's tasks are removed; tasks of the user's other groups and their personal tasks are untouched.
- Existing single-nucleus users from feature 002 → the nucleus becomes one of their groups with no data loss; they can then create additional groups.
- Creating, inviting, accepting or leaving a group while offline → these require connectivity and show a clear "you are offline" message; reading and writing tasks (personal or group) keeps working offline.
- A user belongs to many groups and creates a task → they pick exactly one group (or leave it personal); a task belongs to at most one scope.

## Requirements *(mandatory)*

### Functional Requirements

**Multiple group membership**

- **FR-001**: A signed-in user MUST be able to create more than one group, each with a non-empty name, and MUST be able to belong to multiple groups at the same time.
- **FR-002**: Creating or joining a group MUST NOT require the user to leave any group they already belong to; there is no enforced cap that forces leaving.
- **FR-003**: Each group MUST have its own independent name, member list, invitations and tasks; actions in one group MUST NOT affect any other group.
- **FR-004**: Users MUST be able to see the list of all groups they belong to, each showing its name and member list.
- **FR-005**: Existing members of a single nucleus created under feature 002 MUST have that nucleus preserved as one of their groups, with its members, invitations and tasks intact (no data loss on migration).

**Unified task view & scope**

- **FR-006**: The home MUST show the user's personal tasks together with the tasks of every group they belong to, ordered by the existing rules (features 001/003/007), with no per-group filtering required to see them all.
- **FR-007**: Every task in the unified view MUST display a label identifying its scope: "Personal" or the name of the group it belongs to.
- **FR-008**: When creating a task, the scope MUST default to personal; the user MUST be able to choose instead exactly one group they belong to. A task belongs to at most one scope (personal or a single group).
- **FR-009**: A personal task MUST never be visible to any other user; a group task MUST be visible to all members of that group only.
- **FR-010**: If the user belongs to no groups, the create form MUST offer only the personal scope (no group picker).

**Per-group membership management**

- **FR-011**: Any member of a group MUST be able to generate an invitation for that group as a single-use shareable link that expires after 7 days and is revocable while pending; the invitation grants membership of that group only.
- **FR-012**: A signed-in user who opens a valid invitation MUST be able to accept it and become a member of that group only, leaving their other memberships unchanged.
- **FR-013**: Opening an expired, revoked, already-used or otherwise invalid invitation MUST show a clear reason and MUST NOT create a membership.
- **FR-014**: Opening an invitation for a group the user already belongs to MUST tell them they are already a member and MUST NOT consume the invitation.
- **FR-015**: A member MUST be able to leave a group after confirmation; they are removed from that group only, their personal tasks and other groups are unaffected, and the group's tasks remain with it for the remaining members.
- **FR-016**: When the last member leaves a group, that group and its tasks MUST be dissolved (with a prior warning); the user's other groups MUST remain intact.

**Sharing, sync & isolation (per group)**

- **FR-017**: Any member of a group MUST be able to mark a group task done or revert it; the completion date and completing member MUST be recorded and visible to all members of that group.
- **FR-018**: While online, changes to a group's tasks (create, complete, revert) MUST become visible to that group's other online members within seconds without a manual reload, and MUST NOT be visible to non-members.
- **FR-019**: A user MUST only ever be able to read the tasks of groups they currently belong to, plus their own personal tasks; leaving a group MUST end access to that group's tasks.

### Key Entities *(include if feature involves data)*

- **User account**: A person's identity, established through single sign-on. Attributes: display name, e-mail.
- **Group** *(generalizes the feature-002 "family nucleus")*: A named set of users who share tasks. Attributes: name (required, free text; not required to be unique). A user may belong to many groups. Dissolved when its last member leaves.
- **Membership**: The link between a user account and a group. A user may have many memberships, one per group they belong to. Attributes: member since.
- **Invitation**: A pending offer to join a specific group. Attributes: shareable token/link, the target group, expiry (7 days), state (pending / accepted / revoked / expired), created by.
- **Task** *(extended from feature 001/002/007)*: Has an owner and a scope that is either personal (owner only) or exactly one group (all that group's members). Retains date, completion, description, urgent flag and the member who completed it.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is readable offline?**
Everything the device has last seen: the user's personal tasks and the tasks of
every group they belong to (with completion state, the member who completed
them, description and urgent flag), plus each group's name and member list.
Anonymous (never signed-in) users keep the fully local feature-001 behavior with
personal tasks only.

**What writes are queued locally?**
Creating, completing and reverting tasks — personal or in any group — are
written locally first and queued for sync. Group management actions (create
group, invite, accept, revoke, leave) require connectivity and are not queued;
attempting them offline shows a clear message.

**Conflict-resolution rule on sync:**
Per task, last-write-wins by most recent change time; completion stays
idempotent (concurrent completions converge to a single completion date and
member). Group memberships and invitations cannot conflict because they are
online-only actions. A task's scope is fixed at creation and does not change, so
it cannot conflict across groups.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A signed-in user can create a second (and further) group and belong to all of them simultaneously, with zero forced departures from existing groups.
- **SC-002**: 100% of data from an existing single nucleus (members, invitations, tasks) is present after migration, with identical content and completion state.
- **SC-003**: In the unified home, every task displays the correct scope label (Personal or the owning group's name) for a user belonging to at least three groups.
- **SC-004**: A task created in one group is visible to that group's members and to no member of any other group (verified with isolated accounts).
- **SC-005**: While online, a group task created or completed by one member is visible to the other members of that group within 5 seconds without reloading.
- **SC-006**: Leaving one group removes access to that group's tasks within 10 seconds while leaving every other group's tasks and personal tasks fully readable.
- **SC-007**: The app remains fully usable for reading and writing tasks (personal and group) with no connectivity; queued changes reach the right group's members after reconnection without data loss.

## Assumptions

- **No "active group" concept**: per the clarification, the home shows personal and all groups merged with a scope label, rather than a switcher that filters to one active group. Switching/filtering by group is out of scope for this feature.
- **New tasks default to personal**: sharing to a group is always an explicit choice, reducing accidental sharing.
- **Task scope is fixed at creation**: moving a task between personal and a group, or between groups, remains out of scope (consistent with features 001/002).
- **Flat membership**: all members of a group have equal rights (invite, revoke pending invitations, share tasks, leave). Roles/administration remain out of scope.
- **Invitations are shareable links**: single-use, 7-day expiry, revocable while pending, scoped to one group; the system itself does not send e-mails in this phase.
- **Group names need not be unique**: two groups may share a name; they are distinguished by identity, not by name.
- **No enforced limit** on the number of groups a user may create or join in this phase; a sane practical limit may be revisited if abuse appears.
- **Sign-in remains optional**: anonymous users keep the local-only, personal-only experience; groups require identity, as in feature 002.
- **Existing invitations, SSO, sync/Realtime and RLS are reused**, generalized from one nucleus to many groups; the data model was already tenant-ready (Constitution Principle VIII).
