# Mantenketa

Gestión de tareas de mantenimiento personal/familiar. PWA **local-first**: la
UI lee y escribe siempre en el IndexedDB del navegador (Dexie) y funciona al
completo sin conexión. Con sesión iniciada (SSO de Google, opcional), un motor
de sincronización (outbox + pull + Realtime, last-write-wins) replica las
tareas entre dispositivos y dentro del **núcleo familiar**: invitaciones de un
solo uso, tareas personales o compartidas, y aislamiento por RLS en Postgres.

Licencia: **AGPL-3.0-or-later**.

## Stack

Vite · React 18 · TypeScript (strict) · Dexie (IndexedDB) · Zod ·
vite-plugin-pwa · Supabase (Postgres+RLS, Auth, Realtime) · Vitest ·
Playwright · pnpm (workspace).

## Desarrollo

```bash
pnpm install
pnpm dev          # servidor Vite (apps/web)
```

## Tests

```bash
pnpm test         # Vitest — lógica de dominio (test-first)
pnpm test:e2e     # Playwright — e2e incl. persistencia tras recarga y offline
pnpm lint         # ESLint estricto (no-any)
pnpm --filter @mantenketa/web test:rls   # aislamiento RLS (necesita Supabase en marcha)
```

## Backend (Supabase — feature 002)

- SQL solo en `supabase/migrations/` (Constitución, Principio II); se aplica
  con `supabase db push` (proyecto enlazado con `supabase link`).
- Config del cliente en `apps/web/.env.local` (ver `apps/web/.env.example`):
  `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. Sin ellas la app
  funciona en modo puramente local.
- Los tests RLS y los e2e de auth necesitan además `SUPABASE_SECRET_KEY` en
  `apps/web/.env.local` (clave *secret*; solo admin local — jamás en el
  cliente ni en git). Sin ella, esos tests se saltan.
- Tras cambiar una migración, regenerar tipos:
  `supabase gen types typescript --linked > apps/web/src/data/database.types.ts`
  (o `--local` con el stack de Docker).
- Auth: proveedor de Google activado en el panel; redirect
  `https://<ref>.supabase.co/auth/v1/callback` en Google Cloud Console y
  `http://localhost:5173/**` (más el dominio de Pages al desplegar) en
  Authentication → URL Configuration.

## Despliegue (Cloudflare Workers — Principio VI: un solo entorno)

Proyecto de Workers conectado al repo (build automático en cada push a `main`):

| Ajuste | Valor |
|--------|-------|
| Root directory | `apps/web` |
| Build command | `pnpm build` |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |

La config de despliegue vive en `apps/web/wrangler.jsonc`: sirve `dist/` como
static assets con `not_found_handling: single-page-application` (fallback SPA
para rutas como `/invitacion/<token>`; sustituye al `_redirects` de Pages).
Variables de build necesarias: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
