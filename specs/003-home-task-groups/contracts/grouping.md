# Contract: Task Grouping (UI binding)

**Feature**: 003-home-task-groups

The home binds to one new pure function; everything else reuses existing
contracts (TaskRepository `observeTasks`/`markDone`/`revert`, NucleusService).

```ts
import type { Task } from '../domain/task'

export interface TaskInGroup {
  task: Task
  isOverdue: boolean // true only in `ya` when taskDate < today
}

export interface GroupedTasks {
  ya: TaskInGroup[]      // dateless + due today/earlier (overdue flagged)
  pronto: TaskInGroup[]  // future-dated, soonest first
  hechas: TaskInGroup[]  // up to 5 most recently completed, newest first
}

/**
 * Pure: partitions tasks into the three home groups relative to `today`
 * (device local YYYY-MM-DD). Deterministic — `today` is injected, not read
 * from the clock — so it is unit-testable (Principle IV: overdue detection).
 * Does not mutate the input. `hechas` is capped at 5.
 */
export function groupTasks(tasks: readonly Task[], today: string): GroupedTasks
```

### Contract guarantees (verified by tests)

- **Partition**: every input task appears in exactly one group; counts sum to
  `min(completed, 5) + outstanding`.
- **ya**: contains every outstanding task with `taskDate === null` or
  `taskDate <= today`; dateless first, then `taskDate` ascending.
- **overdue flag**: `isOverdue` is true exactly for ya-tasks with
  `taskDate < today`; false for today-dated and dateless tasks.
- **pronto**: contains every outstanding task with `taskDate > today`, ordered
  `taskDate` ascending; never contains overdue/today/dateless or completed tasks.
- **hechas**: only completed tasks, newest completion first, **at most 5**; a
  6th-newest completed task does not appear.
- **purity**: input array and task objects are not mutated; same inputs → same
  output.
- **boundary**: a task with `taskDate === today` is in `ya` and NOT overdue.

### UI consumption (no new persisted contract)

- The home maps each `observeTasks()` emission through `groupTasks(tasks, today)`
  where `today` is the device local day, re-grouping on every change (covers
  done/revert and realtime nucleus updates).
- `markDone` / `revert` keep their current signatures; the move between groups
  is a consequence of re-grouping, not a new API.
- "Nueva tarea" toggles `CreateTaskForm` visibility (local UI state); the form
  gains `onCancel`; existing `createTask` is unchanged.
