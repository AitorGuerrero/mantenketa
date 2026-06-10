# Contract: Client Services

**Feature**: 002-family-nucleus

The UI binds only to these client-side services. Dexie remains the single
read path; everything network-related lives behind `AuthService`,
`NucleusService`, and the `SyncEngine`.

```ts
import type { Observable } from 'dexie'
import type { Task } from '../domain/task'

/** Session — null while anonymous (the app stays fully usable, FR-002). */
export interface AuthService {
  observeSession(): Observable<UserSession | null>
  signInWithGoogle(): Promise<void>          // redirects (PKCE)
  /** Warns the caller if the outbox is non-empty (FR-005). */
  signOut(opts: { force?: boolean }): Promise<{ pendingPushes: number } | void>
}

export interface UserSession {
  userId: string
  displayName: string
  email: string
}

/** Nucleus management — every method REQUIRES connectivity and a session;
 *  offline calls reject with OfflineError (clear UI message). */
export interface NucleusService {
  observeNucleus(): Observable<NucleusView | null>   // cached in Dexie `meta`
  createNucleus(name: string): Promise<void>          // FR-006, FR-007
  createInvitation(): Promise<{ url: string; expiresAt: string }>  // FR-008
  revokeInvitation(token: string): Promise<void>
  acceptInvitation(token: string): Promise<void>      // FR-009; throws typed
                                                      // errors per FR-010 case
  leaveNucleus(): Promise<void>                       // FR-012, FR-013
}

export interface NucleusView {
  id: string
  name: string
  members: { userId: string; displayName: string; since: string }[]
  pendingInvitations: { token: string; url: string; expiresAt: string; createdBy: string }[]
}

/** TaskRepository — same contract as feature 001 plus scope. */
export interface NewTaskInput {
  name: string
  taskDate?: string | null
  scope?: 'personal' | 'nucleus'   // default 'personal' (FR-014)
}
// createTask/markDone/revert/observeTasks signatures unchanged.
// markDone records completedBy = current user when signed in (FR-016).
// Every write: sets updatedAt = now; when signed in, also enqueues an
// outbox entry (push is async — the local write NEVER waits on the network).

/** SyncEngine — no UI binding; started by the app shell. */
export interface SyncEngine {
  start(): void   // subscribes to session/online events; flush + pull + realtime
  stop(): void
}
```

### Contract guarantees (verified by tests)

- All feature-001 guarantees still hold for anonymous users — zero regression.
- First sign-in adopts all ownerless local tasks: stamped with the user id and
  enqueued; nothing is lost (FR-003 / SC-001 — unit + e2e).
- A local write while offline is visible immediately and reaches the server
  after reconnect (outbox FIFO; SC-004).
- `reconcile` is LWW by `updatedAt` with deterministic tiebreak — pure,
  test-first (Principle IV).
- Nucleus-scoped tasks appear to other members ≤ 5 s while online via the
  realtime subscription (SC-003 — two-context e2e).
- `acceptInvitation` failure modes are typed: `expired`, `revoked`,
  `already-used`, `already-member`, `has-nucleus`, `offline` (FR-010 + edges).
- `signOut` without `force` reports a non-empty outbox instead of discarding
  it; after sign-out the local store is cleared (FR-005).
