-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 008 — Multiple groups per user
-- Contrato: specs/008-multi-nucleus/contracts/groups.md
-- Generaliza el modelo de la feature 002 de "un núcleo por usuario" a N grupos.
-- Sin migración de filas: cada usuario actual conserva su núcleo como un grupo.

-- ───────── 1. Permitir varias membresías por usuario (FR-001/FR-002) ─────────
-- La PK (nucleus_id, user_id) sigue impidiendo unirse dos veces al mismo grupo.
alter table public.memberships drop constraint memberships_user_id_key;

-- ───────── 2. Helper escalar → conjunto de grupos del usuario ─────────
-- Hay que retirar las policies que dependen de my_nucleus_id() antes de
-- sustituir la función (no se puede CREATE OR REPLACE cambiando el tipo).
drop policy profiles_select on public.profiles;
drop policy nuclei_select on public.nuclei;
drop policy memberships_select on public.memberships;
drop policy invitations_select on public.invitations;
drop policy invitations_insert on public.invitations;
drop policy invitations_revoke on public.invitations;
drop policy tasks_select on public.tasks;
drop policy tasks_insert on public.tasks;
drop policy tasks_update on public.tasks;

drop function public.my_nucleus_id();

create or replace function public.my_nucleus_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nucleus_id from public.memberships where user_id = auth.uid()
$$;

-- ───────── 3. Recrear las policies con el helper de conjunto ─────────
-- profiles: la propia + las de compañeros en CUALQUIERA de mis grupos
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships m
      where m.user_id = public.profiles.id
        and m.nucleus_id in (select public.my_nucleus_ids())
    )
  );

create policy nuclei_select on public.nuclei
  for select to authenticated
  using (id in (select public.my_nucleus_ids()));

create policy memberships_select on public.memberships
  for select to authenticated
  using (nucleus_id in (select public.my_nucleus_ids()));

create policy invitations_select on public.invitations
  for select to authenticated
  using (nucleus_id in (select public.my_nucleus_ids()));

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    nucleus_id in (select public.my_nucleus_ids())
    and created_by = auth.uid()
  );

create policy invitations_revoke on public.invitations
  for update to authenticated
  using (nucleus_id in (select public.my_nucleus_ids()) and status = 'pending')
  with check (status = 'revoked');

-- tasks: personales del dueño o de cualquiera de mis grupos (FR-009/FR-019)
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (nucleus_id is null or nucleus_id in (select public.my_nucleus_ids()))
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  )
  with check (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id in (select public.my_nucleus_ids()))
  );

-- ───────── 4. RPCs: sin el límite de un núcleo ─────────

-- create_nucleus → create_group, sin el guard already_in_nucleus (FR-001)
create or replace function public.create_group(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'blank_name';
  end if;
  insert into public.nuclei (name) values (btrim(p_name)) returning id into v_id;
  insert into public.memberships (nucleus_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

drop function public.create_nucleus(text);

-- accept_invitation: sin el guard global; conserva la idempotencia por grupo
-- (already_member NO consume la invitación, FR-014)
create or replace function public.accept_invitation(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.invitations%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  select * into v_inv from public.invitations where token = p_token for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_inv.status = 'revoked' then
    raise exception 'revoked';
  end if;
  if v_inv.status = 'accepted' then
    raise exception 'already_used';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'expired';
  end if;
  if exists (
    select 1 from public.memberships
    where nucleus_id = v_inv.nucleus_id and user_id = v_uid
  ) then
    raise exception 'already_member';
  end if;
  update public.invitations
    set status = 'accepted', accepted_by = v_uid
    where token = p_token;
  insert into public.memberships (nucleus_id, user_id)
    values (v_inv.nucleus_id, v_uid);
  return v_inv.nucleus_id;
end;
$$;

-- leave_nucleus() → leave_group(p_nucleus_id): el usuario tiene varios grupos,
-- así que indica cuál abandona. El último en salir disuelve ese grupo (FR-016).
create or replace function public.leave_group(p_nucleus_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_deleted int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  delete from public.memberships
    where user_id = v_uid and nucleus_id = p_nucleus_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'not_a_member';
  end if;
  -- Cascada: borra tareas e invitaciones del grupo disuelto.
  if not exists (
    select 1 from public.memberships where nucleus_id = p_nucleus_id
  ) then
    delete from public.nuclei where id = p_nucleus_id;
  end if;
end;
$$;

drop function public.leave_nucleus();

-- Permisos de ejecución de las RPCs nuevas (accept_invitation conserva los suyos)
revoke execute on function public.create_group(text) from public, anon;
revoke execute on function public.leave_group(uuid) from public, anon;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
