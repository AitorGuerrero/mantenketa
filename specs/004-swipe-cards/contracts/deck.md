# Contract: Deck Ordering & Swipe Decision (pure)

**Feature**: 004-swipe-cards

The deck binds to two pure functions; everything else reuses existing contracts
(`groupTasks` for the "ya" set, `taskRepository.markDone`, the `TaskItem`
rendering).

```ts
import type { Task } from '../domain/task'

/**
 * Order the "Para hacer ya" deck: non-deferred tasks first (in the given
 * order), then deferred tasks (in deferredIds order); ids in deferredIds that
 * are no longer present in `yaTasks` are dropped. Pure; does not mutate inputs.
 * The current card is the first element.
 */
export function orderDeck(yaTasks: readonly Task[], deferredIds: readonly string[]): Task[]

export type SwipeOutcome = 'done' | 'defer' | 'cancel'

/**
 * Decide the action from the horizontal drag distance `dx` (px; right = +) and
 * a positive `threshold`. >= +threshold → 'done'; <= -threshold → 'defer';
 * otherwise 'cancel' (snap back). Pure.
 */
export function swipeOutcome(dx: number, threshold: number): SwipeOutcome
```

### Contract guarantees (verified by tests)

**orderDeck**
- With no deferrals, returns `yaTasks` in the same order.
- A deferred id is moved to the back; multiple deferrals keep their defer order.
- Non-deferred tasks keep their relative incoming order, ahead of deferred ones.
- A `deferredId` not present in `yaTasks` is ignored (no throw, not included).
- Pure: inputs are not mutated; same inputs → same output.
- Element 0 is the current card; after deferring the current task, element 0 is
  the next task (or the same task if it was the only one).

**swipeOutcome**
- `dx >= threshold` → `'done'`; `dx <= -threshold` → `'defer'`;
  `-threshold < dx < threshold` → `'cancel'`.
- Exactly at `+threshold`/`-threshold` → `'done'`/`'defer'` (inclusive boundary).

### UI consumption

- `TaskDeck` holds `deferredIds` (session state), computes
  `orderDeck(yaTasks, deferredIds)`, renders `orderDeck(...)[0]` as the active
  `TaskCard` (or "¡Todo al día!" when empty), re-deriving on every
  `observeTasks` emission.
- `TaskCard` drag handler computes `dx`, calls `swipeOutcome(dx, threshold)` on
  release → `done` ⇒ `markDone(id)`, `defer` ⇒ parent appends id, `cancel` ⇒
  snap back. The "Hecha"/"Posponer" buttons call the `done`/`defer` paths
  directly (no gesture).
- `TaskGroups` renders the deck for "ya" only when `useCoarsePointer()` is true;
  otherwise the existing list section. "pronto"/"hechas" are always lists.
