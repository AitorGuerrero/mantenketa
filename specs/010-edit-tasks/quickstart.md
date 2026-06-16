# Quickstart: Edit Tasks (feature 010)

Client-only feature — no migration, no type regeneration, no new dependency.

## Build & test

```bash
# from apps/web
pnpm test        # unit incl. domain/edit.test.ts (applyEdit), test-first
pnpm lint
pnpm build
pnpm test:e2e    # incl. edit-tasks.spec.ts
pnpm test:rls    # unchanged isolation still holds (no RLS/trigger change)
```

## Manual smoke (mobile viewport first — Principle IX)

1. Create "Compra". On the task, tap **Editar** → the create form appears,
   pre-filled, with submit label **Guardar** and **no** scope selector.
2. Change the name to "Comprar pan", set a date, toggle **Urgente**, **Guardar**
   → the same task updates in place, re-ordered if needed; no duplicate.
3. Edit again, **clear the date**, save → the task moves to "Para hacer ya".
4. Edit, enable **Repetir** "cada 2 semanas", save → cadence badge appears;
   complete it → next occurrence uses the new cadence. Edit, disable Repetir,
   save → badge gone; completing it spawns no successor.
5. Edit, blank the name, save → rejected with the creation validation message;
   the task is unchanged. **Cancelar** on any edit leaves the task untouched.
6. Complete a task → it shows **no** "Editar"; revert it → "Editar" reappears.
7. (Signed-in, two members of a group) one edits a shared task's name → the
   other sees it within ~5 s without reloading.

## Acceptance mapping

| Spec | Verified by |
|------|-------------|
| US1 (edit content; clear date; cancel; validation) | edit.test.ts; edit-tasks.spec.ts |
| US2 (edit recurrence on/off and cadence) | edit-tasks.spec.ts; edit.test.ts (seriesId on enable) |
| US3 (group propagation; pending-only) | nucleus-tasks-style flow; edit-tasks.spec.ts (no "Editar" on done) |
| SC-003 (identity/scope/completion preserved) | edit.test.ts |

## Rollback

Pure client change: revert the feature commit. No data or schema to undo.
