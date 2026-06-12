# Mantenketa

Gestión de tareas de mantenimiento personal/familiar. PWA **local-only**: los
datos viven en el IndexedDB del navegador (Dexie); no hay backend, ni sync, ni
autenticación en esta fase (diferidos a una fase multi-usuario futura).

Licencia: **AGPL-3.0-or-later**.

## Stack

Vite · React 18 · TypeScript (strict) · Dexie (IndexedDB) · Zod ·
vite-plugin-pwa · Vitest · Playwright · pnpm (workspace).

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
```

## Despliegue (Cloudflare Pages — Principio VI: un solo entorno)

| Ajuste | Valor |
|--------|-------|
| Build command | `pnpm --filter @mantenketa/web build` |
| Build output directory | `apps/web/dist` |
| Production branch | `main` |

`apps/web/public/_redirects` contiene el fallback SPA (`/* /index.html 200`).
No hay variables de entorno ni secretos: no existe backend.
