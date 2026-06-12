# Contract: Backend Surface (Supabase)

**Feature**: 002-family-nucleus

The complete backend contract the client codes against. Implemented entirely
as versioned SQL in `supabase/migrations` (Principle II) — tables and RLS in
[data-model.md](../data-model.md); this file fixes the callable surface and
its error codes.

## RPCs

| RPC | Args | Returns | Errors (SQLSTATE `P0001` + message code) |
|-----|------|---------|------------------------------------------|
| `create_nucleus` | `p_name text` | `uuid` (nucleus id) | `blank_name`, `already_in_nucleus` |
| `accept_invitation` | `p_token uuid` | `uuid` (nucleus id) | `not_found`, `expired`, `revoked`, `already_used`, `already_member`, `already_in_nucleus` |
| `leave_nucleus` | — | `void` | `no_nucleus` |

All three are `SECURITY DEFINER`, `search_path` pinned, and require an
authenticated caller (`auth.uid() IS NOT NULL`).

## Write semantics for `tasks`

- Client upserts full rows (`id` is the client-generated UUID shared with the
  local store).
- A `BEFORE UPDATE` trigger applies LWW: the update is skipped unless
  `NEW.updated_at > OLD.updated_at` (ties keep the stored row; the client's
  reconcile uses the same rule with an id tiebreak, so both sides converge).
- `WITH CHECK` policies make it impossible to write a row whose `owner_id`
  isn't the caller, or whose `nucleus_id` isn't one of the caller's
  memberships.

## Realtime

- Channel: `postgres_changes` on `public.tasks` (INSERT + UPDATE), authorized
  as the signed-in user — RLS filters events to rows the member may see.
- The client treats every event as a `remote Task` fed through `reconcile`.

## Isolation guarantees (RLS tests — Principle IV/VIII)

With two users A (member of nucleus N) and B (no nucleus):

1. B cannot SELECT/UPDATE A's personal tasks (0 rows; write rejected).
2. B cannot SELECT N's nucleus tasks before joining; can after accepting an
   invitation; cannot again after leaving.
3. B cannot INSERT a task with `owner_id = A` nor `nucleus_id = N` (WITH CHECK).
4. An accepted or revoked invitation cannot be accepted again (`already_used`
   / `revoked`).
5. When the last member leaves, the nucleus's tasks and invitations are gone.
