# Contract: Client Data-Access API

**Feature**: 001-task-create-complete · Local-only (Dexie/IndexedDB)

The UI binds to this repository, which reads and writes the device's local store
(Dexie). There is no backend in this phase. This is the contract the UI and its
tests depend on.

```ts
import type { Task } from '../domain/task'

export interface NewTaskInput {
  name: string        // required, non-empty after trim (FR-002)
  taskDate: string    // required, 'YYYY-MM-DD' (FR-003)
}

export interface TaskRepository {
  /**
   * Live, ordered task list (FR-005): outstanding first by taskDate asc,
   * completed below. Re-emits on any local change. (Backed by useLiveQuery.)
   */
  observeTasks(): Observable<Task[]>

  /**
   * Create a task (US1 / FR-001). Generates a client UUID, completedAt = null,
   * createdAt = now. Persists to Dexie.
   * Throws ValidationError if name blank (FR-002) or taskDate missing (FR-003).
   */
  createTask(input: NewTaskInput): Promise<Task>

  /**
   * Mark done (US2 / FR-006, FR-007). Sets completedAt = today.
   * Idempotent: no-op if already done (FR-008).
   */
  markDone(taskId: string): Promise<Task>

  /**
   * Revert to outstanding (FR-010). Clears completedAt.
   * Idempotent: no-op if already outstanding.
   */
  revert(taskId: string): Promise<Task>
}
```

### Contract guarantees (verified by tests)

- `createTask` with blank/whitespace `name` rejects and writes nothing (FR-002).
- `createTask` with missing `taskDate` rejects and writes nothing (FR-003).
- After `createTask`, the task appears in `observeTasks()` immediately, with or
  without connectivity (SC-002).
- `observeTasks()` ordering: all outstanding (sorted `taskDate` asc) precede all
  completed (FR-005); covered by a unit test on the pure ordering function.
- `markDone` twice ⇒ identical result, `completedAt` unchanged after first
  (FR-008).
- `revert` after `markDone` ⇒ `completedAt === null` (FR-010).
- Tasks persist across app restart / page reload (FR-004, SC-005).
