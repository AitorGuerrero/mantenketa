-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 009 — Recurring tasks
-- Contrato: specs/009-recurring-tasks/contracts/recurrence.md
-- Aditivo: dos columnas anulables en tasks. Sin cambios en RLS ni en el
-- trigger tasks_guard (el sucesor es un INSERT normal; saltar/parar son UPDATE
-- de task_date/recurrence, que el guard permite).

alter table public.tasks add column recurrence jsonb;
alter table public.tasks add column series_id uuid;
