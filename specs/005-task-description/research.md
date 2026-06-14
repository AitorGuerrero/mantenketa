# Phase 0 Research: Task Description

**Feature**: 005-task-description · **Date**: 2026-06-14

Tiny additive feature. Decisions: where the field lives and how it threads
through the existing local-first + sync stack. Constitution v4.1.0.

## Decision 1: A field on the task, not a new entity

**Decision**: `description: string | null` on the `Task` domain type, a
`description text` column on `public.tasks`, and a key on the Dexie row. Null
(or absent) means no description.

**Rationale**: It is intrinsic to the task, 1:1, and must sync with it. A column
keeps it under the task's existing owner/nucleus RLS (Principle VIII) with zero
new policy. A separate entity would be over-engineering (Principle VII).

## Decision 2: Normalize blank → null in the shared parser (test-first)

**Decision**: `parseNewTask` trims the description; empty/whitespace becomes
`null`; otherwise the text is kept verbatim (including internal line breaks).
This is the only domain logic and is unit-tested first (Principle IV).

**Rationale**: One definition (Principle II); guarantees FR-005 (blank = none)
and FR-006 (line breaks preserved) deterministically.

## Decision 3: Dexie v3 upgrade backfills `description = null`

**Decision**: `db.version(3)` adds no index (description isn't queried) and an
`upgrade()` that sets `description = null` on existing rows, mirroring the v2
pattern.

**Rationale**: Keeps the stored shape consistent with the type for pre-existing
tasks (FR-008); no index needed since we never filter/sort by description.

## Decision 4: Carry through the existing sync mapping

**Decision**: `taskToRow`/`rowToTask` include `description`. No change to the
outbox flusher, puller, Realtime subscription, or the LWW reconcile — the field
rides along in the same row.

**Rationale**: Reuses the proven sync path (Principle VII); LWW by `updatedAt`
already covers the whole row including the description.

## Decision 5: Display — full in lists, clamped on the card

**Decision**: Show the description under the task in the lists (full, wrapped,
line breaks preserved). On the compact swipe card show it clamped to a few lines
(CSS line-clamp) since the card is space-constrained; the stored text is always
complete.

**Rationale**: Mobile-first (Principle IX): the card stays scannable; the list
is the place to read the full text. No truncation of stored data.

## Decision 6: Migration application

**Decision**: New migration `supabase/migrations/20260614120000_task_description.sql`
(`ALTER TABLE public.tasks ADD COLUMN description text`); applied to the linked
project with `supabase db push`; regenerate `database.types.ts`.

**Rationale**: SQL stays in the versioned migrations dir (Principle II); the
single Supabase project is updated (Principle VI).

---

## Resolved unknowns summary

| Unknown | Resolution |
|---------|-----------|
| Where it lives | `description` field/column on the task (no new entity) |
| Blank handling | trimmed; empty/whitespace → null (parseNewTask, test-first) |
| Line breaks | preserved verbatim; displayed with breaks |
| Local schema | Dexie v3 upgrade backfilling null; no index |
| Sync | existing outbox/pull/Realtime + row mapping; LWW unchanged |
| Display | full in lists, line-clamped on the card |
| Editing later | out of scope (future task-edit feature) |

No `NEEDS CLARIFICATION` items remain.
