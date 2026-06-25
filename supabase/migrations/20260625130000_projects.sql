-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 013 — agrupar tareas por proyectos.
-- Contrato: specs/013-task-projects/spec.md
-- Un proyecto es personal (owner) o de grupo (nucleus). Su visibilidad sigue las
-- MISMAS reglas que tasks (dueño o miembro del núcleo), reutilizando
-- public.my_nucleus_ids(). Las tareas referencian project_id (anulable); borrar
-- un proyecto deja sus tareas sin proyecto (on delete set null) — no las borra.
-- Aditivo: no cambia la RLS de tasks ni el trigger tasks_guard (solo protege
-- owner_id/nucleus_id); project_id es una columna mutable normal.

create table public.projects (
  id uuid primary key,                                   -- uuid de cliente (como tasks)
  owner_id uuid not null references public.profiles (id) on delete cascade,
  nucleus_id uuid references public.nuclei (id) on delete cascade,  -- null ⇒ personal
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Visible: personal del dueño o de cualquiera de mis grupos (igual que tasks)
create policy projects_select on public.projects
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  );

create policy projects_insert on public.projects
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (nucleus_id is null or nucleus_id in (select public.my_nucleus_ids()))
  );

-- Renombrar: el dueño (personal) o cualquier miembro (proyecto de grupo)
create policy projects_update on public.projects
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  )
  with check (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  );

create policy projects_delete on public.projects
  for delete to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  );

alter table public.tasks
  add column project_id uuid references public.projects (id) on delete set null;
