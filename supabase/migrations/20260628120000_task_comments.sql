-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 017 — comentarios en las tareas.
-- Contrato: specs/017-task-comments/spec.md
-- Un comentario pertenece a una instancia de tarea (task_id) y hereda su ámbito:
-- personal (owner) o de grupo (nucleus). Visibilidad y alta siguen las MISMAS
-- reglas que tasks/projects (dueño o miembro del núcleo, vía my_nucleus_ids()).
-- Editar/borrar es SOLO del autor (owner_id = auth.uid()), más estricto que tasks.
-- series_id (anulable) duplica la serie de la tarea para agrupar instancias
-- anteriores en cliente sin join. LWW + propiedad/tarea inmutables por trigger.

create table public.comments (
  id uuid primary key,                                   -- uuid de cliente (como tasks)
  task_id uuid not null references public.tasks (id) on delete cascade,
  series_id uuid,                                        -- serie de la tarea; null ⇒ no recurrente
  owner_id uuid not null references public.profiles (id) on delete cascade,  -- = autor
  nucleus_id uuid references public.nuclei (id) on delete cascade,           -- null ⇒ personal
  body text not null check (btrim(body) <> ''),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index comments_task_id_idx on public.comments (task_id);
create index comments_series_id_idx on public.comments (series_id);

alter table public.comments enable row level security;

-- Visible: del autor (personal) o de cualquiera de mis grupos (igual que tasks)
create policy comments_select on public.comments
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  );

-- Alta: debo ser el autor, y el grupo (si lo hay) debe ser mío
create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (nucleus_id is null or nucleus_id in (select public.my_nucleus_ids()))
  );

-- Editar: SOLO el autor (FR-004)
create policy comments_update on public.comments
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Borrar: SOLO el autor (FR-004)
create policy comments_delete on public.comments
  for delete to authenticated
  using (owner_id = auth.uid());

-- LWW + autor/tarea inmutables (espejo de tasks_guard)
create or replace function public.comments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id
     or new.task_id is distinct from old.task_id then
    raise exception 'immutable_comment';
  end if;
  if new.updated_at <= old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

create trigger comments_lww
  before update on public.comments
  for each row execute function public.comments_guard();

-- Realtime: postgres_changes sobre comments (respeta RLS) para ver comentarios
-- de otros miembros sin recargar.
alter publication supabase_realtime add table public.comments;
