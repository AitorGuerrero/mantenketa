# Quickstart: Urgent Tasks
**Feature**: 007-urgent-tasks

## Backend
```bash
supabase db push
supabase gen types typescript --linked > apps/web/src/data/database.types.ts
```
## Test
```bash
pnpm --filter @mantenketa/web test       # orderYa urgent-first + parseNewTask
pnpm --filter @mantenketa/web test:e2e   # urgent marked + sorts first
pnpm --filter @mantenketa/web lint
```
## Verify
1. Nueva tarea → marca "Urgente" (fecha hoy/pasada) → aparece arriba de "Para
   hacer ya", claramente marcada.
2. Urgente con fecha futura → marcada pero en "Para hacer pronto", orden por fecha.
3. Sin marcar → igual que hoy.
