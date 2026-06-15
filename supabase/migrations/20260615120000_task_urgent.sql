-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 007 — marcar tareas como urgentes.
-- Columna booleana con default false; las filas existentes quedan no urgentes.
-- Hereda la RLS de public.tasks (propietario / núcleo): sin cambios de política.

alter table public.tasks add column urgent boolean not null default false;
