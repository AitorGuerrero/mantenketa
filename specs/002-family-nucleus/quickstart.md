# Quickstart: Family Nucleus, Invitations & Sign-In

**Feature**: 002-family-nucleus · Stack: Vite + React + TS PWA (Cloudflare
Pages) · Dexie local store · **Supabase** (Postgres+RLS, Auth SSO, Realtime).

> pnpm for everything. SQL only in `supabase/migrations`.

## Prerequisites

- Node 20+, pnpm 9+
- **Supabase CLI** + **Docker** (local stack: `supabase start`)
- A Supabase project (production) + Google OAuth credentials (Cloud Console →
  OAuth client; authorized redirect: `https://<project>.supabase.co/auth/v1/callback`)

## 1. Environment

`apps/web/.env.local` (never committed; `.env.example` is):

```bash
VITE_SUPABASE_URL=...        # local: from `supabase start` output
VITE_SUPABASE_ANON_KEY=...   # publishable anon key (safe in client)
```

No env vars ⇒ the app runs in pure local-only mode (feature 001 behavior).

## 2. Develop

```bash
pnpm install
supabase start                       # local Postgres+Auth+Realtime (Docker)
supabase db reset                    # applies supabase/migrations
pnpm --filter @mantenketa/web dev
```

Regenerate row types after any migration change:

```bash
supabase gen types typescript --local > apps/web/src/data/database.types.ts
```

## 3. Test

```bash
pnpm --filter @mantenketa/web test        # unit (reconcile, adoption, invitation state)
pnpm --filter @mantenketa/web test:rls    # RLS isolation vs local Supabase
pnpm --filter @mantenketa/web test:e2e    # Playwright (incl. two-context sharing)
```

## 4. Verify end to end

1. Use the app anonymously → everything from feature 001 works (FR-002).
2. Sign in with Google → previous tasks survive as personal tasks (SC-001).
3. Create a nucleus, generate an invitation, open it in a second browser with
   another account, accept → both see the member list (US2).
4. Create a nucleus task in browser 1 → appears in browser 2 ≤ 5 s; complete
   it in browser 2 → browser 1 shows who completed it (US3 / SC-003).
5. Go offline in browser 1, create + complete tasks → instant locally; back
   online → they reach browser 2 (SC-004). Try to invite while offline → clear
   message.
6. Sign in on a fresh browser → all tasks present ≤ 10 s (SC-005).

## 5. Deploy (single environment — Principle VI)

- Cloudflare Pages: build `pnpm --filter @mantenketa/web build`, output
  `apps/web/dist`, env vars `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Supabase production: `supabase db push` from `main`; enable the Google
  provider; add the Pages domain to Auth → URL configuration (redirect URLs).
