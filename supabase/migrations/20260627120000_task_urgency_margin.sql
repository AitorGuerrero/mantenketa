-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 015 — urgencia basada en tiempo (margen de urgencia).
-- Contrato: specs/015-urgency-margin/spec.md
-- Sustituye el booleano urgent (007) por urgency_margin int anulable: días que
-- deben pasar desde la fecha de referencia (fecha de la tarea o, si no tiene,
-- su fecha de creación) hasta que empieza a ser urgente. null ⇒ nunca urgente;
-- 0 ⇒ urgente al llegar la referencia. La urgencia se calcula en cliente.
-- Migración de datos: urgent=true ⇒ 0 (preserva la urgencia previa), false ⇒ null.
-- Hereda la RLS de public.tasks (propietario / núcleo): sin cambios de política.

alter table public.tasks
  add column urgency_margin int
    check (urgency_margin is null or urgency_margin >= 0);

update public.tasks
  set urgency_margin = case when urgent then 0 else null end;

alter table public.tasks drop column urgent;
