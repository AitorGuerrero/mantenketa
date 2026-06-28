-- SPDX-License-Identifier: AGPL-3.0-or-later
-- Copyright (C) 2026 Aitor Guerrero
--
-- Feature 017 — refuerzo del aislamiento de comentarios (Principio VIII).
-- La policy de alta original solo comprobaba owner/nucleus del propio
-- comentario; no verificaba que la TAREA comentada fuese visible para el autor.
-- Se reescribe para exigir: ser el autor, que la tarea exista y sea visible
-- (dueño o miembro del núcleo), y que el ámbito del comentario coincida con el
-- de la tarea (no se puede "colar" un comentario en otro grupo o en una tarea
-- personal ajena).

drop policy comments_insert on public.comments;

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1
      from public.tasks t
      where t.id = task_id
        and t.nucleus_id is not distinct from nucleus_id
        and (
          t.owner_id = auth.uid()
          or (t.nucleus_id is not null and t.nucleus_id in (select public.my_nucleus_ids()))
        )
    )
  );
