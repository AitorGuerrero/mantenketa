# Feature Specification: Family Nucleus, Invitations & Sign-In

**Feature Branch**: `002-family-nucleus`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Núcleo familiar con invitaciones y autenticación. Los usuarios pueden autenticarse en la aplicación (inicio de sesión sencillo, SSO). Un usuario autenticado puede crear un núcleo familiar, invitar a otras personas a unirse (por enlace o correo), y los invitados pueden aceptar la invitación y pasar a ser miembros. Las tareas pueden ser personales (por defecto, visibles solo para su dueño) o del núcleo familiar (visibles para todos los miembros). Un miembro puede abandonar el núcleo. Las tareas existentes creadas antes de autenticarse se conservan y pasan a ser tareas personales del usuario al iniciar sesión por primera vez."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and keep my tasks (Priority: P1)

A person who has been using the app locally signs in with an existing personal
identity (single sign-on — no new password to manage). All the tasks they
created before signing in are preserved and become their personal tasks. From
then on, signing in on any other device shows the same personal tasks.

**Why this priority**: Identity is the foundation every nucleus capability
depends on, and it already delivers standalone value: personal tasks survive
device loss and follow the user across devices. Without it there is no "who"
to invite or to own anything.

**Independent Test**: With tasks already created locally, sign in for the
first time and confirm every task is still there as a personal task; sign in
on a second browser/device and confirm the same tasks appear. Fully testable
with no nucleus implemented.

**Acceptance Scenarios**:

1. **Given** a device with locally created tasks and no session, **When** the user signs in for the first time, **Then** all existing tasks are preserved and become personal tasks of that user (none lost, names/dates/completion intact).
2. **Given** a signed-in user with personal tasks, **When** they sign in on a different device, **Then** their personal tasks appear there with the same content and completion state.
3. **Given** a user who never signs in, **When** they use the app, **Then** everything from feature 001 keeps working locally (sign-in is optional; only nucleus and multi-device features require it).
4. **Given** a signed-in user, **When** they sign out, **Then** they are warned if there are changes not yet saved remotely, and after confirming, their data is no longer accessible on that device.

---

### User Story 2 - Create a nucleus and invite my family (Priority: P2)

A signed-in user creates a family nucleus with a name (e.g. "Casa Guerrero"),
generates an invitation and shares it (link they can send by any channel —
e-mail, messaging). The invited person signs in, opens the invitation, accepts
it, and becomes a member. Members can see who is in the nucleus and which
invitations are pending, and any member can leave the nucleus.

**Why this priority**: The nucleus is the container that makes sharing
possible. It is valuable on its own (the family is connected, membership is
visible) even before tasks are shared.

**Independent Test**: With two signed-in users, one creates a nucleus and
generates an invitation link; the other opens it and accepts; both see each
other in the member list. One leaves and disappears from the list.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no nucleus, **When** they create a nucleus providing a name, **Then** the nucleus exists and they are its first member.
2. **Given** a member of a nucleus, **When** they generate an invitation, **Then** they obtain a shareable link that can be sent through any channel, valid for a limited time and usable once.
3. **Given** a signed-in user who opens a valid invitation, **When** they accept it, **Then** they become a member of the nucleus and both they and existing members can see the updated member list.
4. **Given** an invitation that has expired, was revoked, or was already used, **When** someone opens it, **Then** they are told clearly why it is no longer valid and no membership is created.
5. **Given** a member of a nucleus, **When** they choose to leave and confirm, **Then** they are no longer a member, their personal tasks are unaffected, and tasks of the nucleus stay with the nucleus.
6. **Given** the only remaining member of a nucleus, **When** they leave and confirm the warning, **Then** the nucleus is dissolved together with its nucleus tasks.

---

### User Story 3 - Share tasks with the nucleus (Priority: P3)

When creating a task, a member chooses whether it is personal (default —
visible only to them) or of the family nucleus. Nucleus tasks are visible to
every member; any member can mark them done or revert them, and everyone sees
the same state.

**Why this priority**: This is the payoff of the nucleus, but it depends on
identity (US1) and membership (US2) being in place.

**Independent Test**: With a nucleus of two members, one creates a nucleus
task; the other sees it appear in their list, marks it done, and the first
member sees it completed.

**Acceptance Scenarios**:

1. **Given** a member creating a task, **When** they do not choose a scope, **Then** the task is personal and no other user can ever see it.
2. **Given** a member creating a task, **When** they mark it as a nucleus task, **Then** every member of the nucleus sees it in their list (name, date or "right away", completion state), ordered by the same rules as feature 001.
3. **Given** a nucleus task, **When** any member marks it done, **Then** all members see it completed with the completion date, and the member who completed it is recorded.
4. **Given** members using the app at the same time while online, **When** one creates or completes a nucleus task, **Then** the others see the change reflected within seconds without reloading.

---

### Edge Cases

- A signed-in user who already belongs to a nucleus opens another nucleus's invitation → they are told they must leave their current nucleus first; nothing changes.
- The inviter leaves the nucleus before the invitation is accepted → the invitation belongs to the nucleus and remains valid while unexpired and not revoked.
- A user opens their own nucleus's invitation → they are told they are already a member; the invitation is not consumed.
- A user tries to accept an invitation without being signed in → they are asked to sign in first and then continue accepting the same invitation.
- Two members mark the same nucleus task done at almost the same time → completion is idempotent; a single completion date and completing member are recorded (latest change wins).
- A member completes a nucleus task while offline and another member completed it earlier online → on reconnection the states converge to one completion without duplicates (latest change wins).
- The user clears browser/site data with changes not yet synced → those unsynced changes are lost; everything previously synced is restored on next sign-in.
- Creating a nucleus, inviting, accepting, or leaving while offline → these actions require connectivity and show a clear "you are offline" message; task reads/writes keep working offline.

## Requirements *(mandatory)*

### Functional Requirements

**Identity**

- **FR-001**: Users MUST be able to sign in with an existing personal identity through a trusted single sign-on provider; the application MUST NOT store or manage passwords itself.
- **FR-002**: The application MUST remain fully usable without signing in, with the local-only behavior of feature 001; signing in is required only for multi-device access and nucleus features.
- **FR-003**: On a user's first sign-in on a device, every task previously created on that device MUST be preserved and become a personal task of that user (no loss, content intact).
- **FR-004**: A signed-in user's personal tasks MUST be available on any device where they sign in.
- **FR-005**: Users MUST be able to sign out; if changes have not yet been saved remotely, the user MUST be warned before completing sign-out, and afterwards their data MUST no longer be readable on that device.

**Nucleus & membership**

- **FR-006**: A signed-in user MUST be able to create a family nucleus by providing a non-empty name.
- **FR-007**: A user MUST belong to at most one nucleus at a time.
- **FR-008**: Any member MUST be able to generate an invitation as a shareable link; each invitation MUST be single-use, MUST expire after 7 days, and MUST be revocable by any member while pending.
- **FR-009**: A signed-in user who opens a valid invitation MUST be able to accept it and become a member of the nucleus.
- **FR-010**: Opening an expired, revoked, already-used, or otherwise invalid invitation MUST show a clear reason and MUST NOT create a membership.
- **FR-011**: Members MUST be able to see the nucleus name, its member list, and pending invitations.
- **FR-012**: A member MUST be able to leave the nucleus after confirmation; their personal tasks are unaffected and nucleus tasks remain with the nucleus.
- **FR-013**: When the last member leaves a nucleus, the nucleus and its nucleus tasks MUST be dissolved; the leaving member MUST be warned of this before confirming.

**Task sharing**

- **FR-014**: When creating a task, a member MUST be able to choose its scope: personal (default) or nucleus; a personal task MUST never be visible to any other user.
- **FR-015**: Nucleus tasks MUST be visible to all members of the nucleus, showing name, date (or "right away"), and completion state, ordered by the same rules as feature 001 (FR-005 of feature 001).
- **FR-016**: Any member MUST be able to mark a nucleus task done or revert it; the completion date and the completing member MUST be recorded and visible to all members.
- **FR-017**: While online, changes to nucleus tasks (create, complete, revert) MUST become visible to other online members within seconds without a manual reload.

### Key Entities *(include if feature involves data)*

- **User account**: A person's identity in the system, established through single sign-on. Attributes: display name, e-mail (from the identity provider).
- **Family nucleus**: A named group of users who share tasks. Attributes: name (required, free text). Dissolved when its last member leaves.
- **Membership**: The link between a user account and a nucleus. A user has at most one. Attributes: member since.
- **Invitation**: A pending offer to join a nucleus. Attributes: shareable token/link, expiry (7 days), state (pending / accepted / revoked / expired), created by.
- **Task** *(extended from feature 001)*: Gains an owner (the account that created it) and a scope — personal (owner only) or nucleus (all members). Nucleus tasks also record which member completed them.

## Offline Behavior *(mandatory — Constitution Principle I)*

**What data is readable offline?**
Everything the device has last seen: all of the user's personal tasks and all
nucleus tasks (with completion state and member who completed them), the
nucleus name and member list. Anonymous (never signed-in) users keep the fully
local feature-001 behavior.

**What writes are queued locally?**
Creating, completing, and reverting tasks — personal and nucleus — are written
locally first and queued for sync; they are sent when connectivity returns.
Nucleus management actions (create nucleus, invite, accept, revoke, leave)
require connectivity and are not queued: attempting them offline shows a clear
message.

**Conflict-resolution rule on sync:**
Per task, last-write-wins by most recent change time: the latest change to a
task (content or completion state) replaces earlier concurrent ones, and
completion stays idempotent — concurrent completions converge to a single
completion date and completing member. Memberships and invitations cannot
conflict because they are online-only actions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of tasks created before first sign-in are present as personal tasks afterwards, with identical content and completion state.
- **SC-002**: A person receiving an invitation link can go from opening it (including signing in) to seeing the nucleus's shared tasks in under 3 minutes.
- **SC-003**: While online, a nucleus task created or completed by one member is visible to the other members within 5 seconds, without reloading.
- **SC-004**: The app remains fully usable for reading and writing tasks with no connectivity; after reconnecting, queued changes reach the other members without data loss.
- **SC-005**: A user signing in on a new device sees all their personal and nucleus tasks within 10 seconds of completing sign-in.
- **SC-006**: An invitation can be generated and shared in under 30 seconds from the nucleus screen.

## Assumptions

- **Sign-in is optional**: the local-only experience of feature 001 remains the default for anonymous users; identity unlocks sync and nucleus features. This preserves Constitution Principle I (Local-First).
- **One nucleus per user**: a user belongs to at most one nucleus at a time and must leave it before joining another. Multiple simultaneous nuclei are out of scope.
- **Flat membership**: all members have equal rights (invite, revoke pending invitations, share tasks, leave). Roles/administration are out of scope for this feature.
- **Invitations are shareable links**: single-use, 7-day expiry, revocable while pending. The link can be sent through any channel (e-mail, messaging); the system itself does not send e-mails in this phase.
- **Task scope is fixed at creation**: converting a personal task into a nucleus task (or back) is out of scope for this feature.
- **Personal tasks are stored remotely too** (to enable multi-device access) but are only ever visible to their owner; isolation is enforced in the data layer (Constitution Principle VIII activates with this feature).
- **Assigning a responsible member, recurrence, effort, and importance** remain out of scope — future features.
- **Editing/deleting tasks** remains out of scope (as in feature 001), except that dissolving a nucleus removes its tasks.
- **A backend service becomes part of the stack with this feature**; adopting it requires the planned constitution amendment (the current constitution explicitly defers it and names the intended provider).
