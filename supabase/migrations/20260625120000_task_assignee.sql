-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 012 — asignar una tarea de grupo a un miembro.
-- Contrato: specs/012-assign-task-member/spec.md
-- Aditivo: una columna anulable assignee_id en tasks (FK a profiles; al borrar
-- el perfil la asignación se limpia). No cambia RLS ni el trigger tasks_guard
-- (solo protege owner_id/nucleus_id); reasignar es un UPDATE normal que las
-- políticas tasks_update ya permiten a los miembros del núcleo. La visibilidad
-- sigue siendo por pertenencia al núcleo: el asignado es informativo.

alter table public.tasks
  add column assignee_id uuid references public.profiles (id) on delete set null;
