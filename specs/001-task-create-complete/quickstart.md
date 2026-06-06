# Quickstart: Task Create & Complete

**Feature**: 001-task-create-complete · Stack: Vite + React + TypeScript PWA on
Cloudflare Pages · local-only (browser IndexedDB via Dexie). No backend.

> Use **pnpm** for everything (project preference). Never `npm`.

## Prerequisites

- Node 20+, pnpm 9+
- A modern browser (the only runtime; data lives in its IndexedDB)

## 1. Project layout (created during implementation)

```
apps/web/                 # the Vite + React PWA (the only deployable)
  src/
    domain/               # Task type + Zod schema + pure logic (ordering,
                          #   completion toggle) — unit-tested, test-first
    data/                 # Dexie database + TaskRepository implementation
    components/  pages/
  tests/                  # vitest (unit) + playwright (e2e)
pnpm-workspace.yaml       # workspaces-ready; no shared/backend package yet
```

## 2. Environment

No backend means **no secrets and no `.env` required** to run. (A `.env` may
appear later only when a backend phase is added.)

## 3. Develop

```bash
pnpm install
pnpm --filter @mantenketa/web dev      # Vite dev server (PWA)
```

## 4. Test (Principle IV — domain logic is test-first)

```bash
pnpm --filter @mantenketa/web test       # vitest: ordering + completion-state transitions
pnpm --filter @mantenketa/web test:e2e   # playwright: incl. reload-persistence
```

## 5. Verify the feature end to end

1. Create a task with a name + date → it appears at the top region (outstanding,
   by date asc) immediately. (US1 / SC-001, SC-002)
2. Turn off the network (DevTools → Offline), create another task → it still
   appears instantly — the app is local-only. (SC-002)
3. Mark a task done → it moves to the completed group; completion date recorded.
   (US2 / SC-003, SC-004)
4. Revert it → returns to outstanding, completion date cleared. (FR-010)
5. Reload the page / restart the app → all tasks and their state are still there.
   (FR-004 / SC-005)

## 6. Deploy (single environment — Principle VI)

- Cloudflare Pages project builds `apps/web` from `main` → production.
- PR preview deploys are automatic and free (allowed by Principle VI).
- No backend to provision. Each user's data stays in their own browser.
