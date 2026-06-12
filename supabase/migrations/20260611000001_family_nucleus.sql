-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 002 — Family Nucleus, Invitations & Sign-In
-- Contrato: specs/002-family-nucleus/contracts/backend.md
-- Principio VIII: todo dato con propietario + aislamiento por RLS.

-- ───────────────────────────── Tablas ─────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  email text not null default '',
  created_at timestamptz not null default now()
);

create table public.nuclei (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now()
);

create table public.memberships (
  nucleus_id uuid not null references public.nuclei (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  since timestamptz not null default now(),
  primary key (nucleus_id, user_id),
  -- un núcleo por usuario (FR-007)
  unique (user_id)
);

create table public.invitations (
  token uuid primary key default gen_random_uuid(),
  nucleus_id uuid not null references public.nuclei (id) on delete cascade,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked')),
  accepted_by uuid references public.profiles (id)
);

create table public.tasks (
  id uuid primary key, -- generado por el cliente (mismo id que la fila local)
  owner_id uuid not null references public.profiles (id) on delete cascade,
  nucleus_id uuid references public.nuclei (id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  task_date date,
  completed_at date,
  completed_by uuid references public.profiles (id),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create index tasks_owner_idx on public.tasks (owner_id);
create index tasks_nucleus_idx on public.tasks (nucleus_id);

-- ─────────────── Perfil automático al registrarse ────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ──────── LWW + inmutabilidad de propiedad en tasks (sync) ───────

create or replace function public.tasks_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- El ámbito y el propietario se fijan al crear (spec: scope fijo)
  if new.owner_id is distinct from old.owner_id
     or new.nucleus_id is distinct from old.nucleus_id then
    raise exception 'immutable_ownership';
  end if;
  -- Last-write-wins: ignorar escrituras no más nuevas (empate conserva la almacenada)
  if new.updated_at <= old.updated_at then
    return old;
  end if;
  return new;
end;
$$;

create trigger tasks_lww
  before update on public.tasks
  for each row execute function public.tasks_guard();

-- ───────────── Helper: núcleo del usuario autenticado ────────────
-- SECURITY DEFINER para evitar recursión de RLS en las policies.

create or replace function public.my_nucleus_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nucleus_id from public.memberships where user_id = auth.uid()
$$;

-- ────────────────────────────── RLS ──────────────────────────────

alter table public.profiles enable row level security;
alter table public.nuclei enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.tasks enable row level security;

-- profiles: la propia fila + las de los compañeros de núcleo (lista de miembros)
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.memberships m
      where m.user_id = public.profiles.id
        and m.nucleus_id = public.my_nucleus_id()
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- nuclei: visible solo para sus miembros; el alta va por RPC
create policy nuclei_select on public.nuclei
  for select to authenticated
  using (id = public.my_nucleus_id());

-- memberships: visibles dentro del propio núcleo; mutaciones solo por RPC
create policy memberships_select on public.memberships
  for select to authenticated
  using (nucleus_id = public.my_nucleus_id());

-- invitations: los miembros las listan, crean y revocan; aceptar va por RPC
create policy invitations_select on public.invitations
  for select to authenticated
  using (nucleus_id = public.my_nucleus_id());

create policy invitations_insert on public.invitations
  for insert to authenticated
  with check (
    nucleus_id = public.my_nucleus_id()
    and created_by = auth.uid()
  );

create policy invitations_revoke on public.invitations
  for update to authenticated
  using (nucleus_id = public.my_nucleus_id() and status = 'pending')
  with check (status = 'revoked');

-- tasks: personales del dueño o del núcleo del usuario (FR-014/FR-015)
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id = public.my_nucleus_id())
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and (nucleus_id is null or nucleus_id = public.my_nucleus_id())
  );

create policy tasks_update on public.tasks
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id = public.my_nucleus_id())
  )
  with check (
    owner_id = auth.uid()
    or (nucleus_id is not null and nucleus_id = public.my_nucleus_id())
  );

-- Sin policy de DELETE: el borrado solo ocurre por cascada (disolución).

-- ────────────────────────────── RPCs ─────────────────────────────

create or replace function public.create_nucleus(p_name text)
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
  if exists (select 1 from public.memberships where user_id = v_uid) then
    raise exception 'already_in_nucleus';
  end if;
  insert into public.nuclei (name) values (btrim(p_name)) returning id into v_id;
  insert into public.memberships (nucleus_id, user_id) values (v_id, v_uid);
  return v_id;
end;
$$;

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
  if exists (select 1 from public.memberships where user_id = v_uid) then
    raise exception 'already_in_nucleus';
  end if;
  update public.invitations
    set status = 'accepted', accepted_by = v_uid
    where token = p_token;
  insert into public.memberships (nucleus_id, user_id)
    values (v_inv.nucleus_id, v_uid);
  return v_inv.nucleus_id;
end;
$$;

create or replace function public.leave_nucleus()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_nucleus uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  delete from public.memberships where user_id = v_uid
    returning nucleus_id into v_nucleus;
  if v_nucleus is null then
    raise exception 'no_nucleus';
  end if;
  -- El último en salir disuelve el núcleo (FR-013): cascada borra
  -- sus tareas e invitaciones.
  if not exists (
    select 1 from public.memberships where nucleus_id = v_nucleus
  ) then
    delete from public.nuclei where id = v_nucleus;
  end if;
end;
$$;

-- Solo usuarios autenticados pueden invocar las RPCs
revoke execute on function public.create_nucleus(text) from public, anon;
revoke execute on function public.accept_invitation(uuid) from public, anon;
revoke execute on function public.leave_nucleus() from public, anon;
grant execute on function public.create_nucleus(text) to authenticated;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.leave_nucleus() to authenticated;

-- ─────────────────────────── Realtime ────────────────────────────
-- postgres_changes sobre tasks (respeta RLS) para SC-003 (≤ 5 s).

alter publication supabase_realtime add table public.tasks;
