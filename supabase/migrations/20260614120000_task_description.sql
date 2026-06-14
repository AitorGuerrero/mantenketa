-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 005 — descripción opcional en las tareas.
-- Columna nullable; las filas existentes quedan con NULL (sin descripción).
-- Hereda la RLS de public.tasks (propietario / núcleo): sin cambios de política.

alter table public.tasks add column description text;
