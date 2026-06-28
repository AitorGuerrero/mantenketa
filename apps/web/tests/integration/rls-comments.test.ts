// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  adminClient,
  createTestUser,
  deleteNucleus,
  makeTaskRow,
  must,
  type Client,
  type TestUser,
} from './helpers'

// Feature 017 — aislamiento RLS de comentarios (Principio VIII):
// personales solo del dueño; de grupo visibles para los miembros; alta solo en
// tareas visibles; editar/borrar SOLO el autor.

const admin: Client = adminClient()
let userA: TestUser
let userB: TestUser
let userC: TestUser
let group: string
let personalTaskId: string
let groupTaskId: string
let aGroupCommentId: string
const orphanNuclei: string[] = []

function makeCommentRow(ownerId: string, taskId: string, overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    task_id: taskId,
    series_id: null,
    owner_id: ownerId,
    nucleus_id: null,
    body: 'comentario de prueba',
    created_at: now,
    updated_at: now,
    ...overrides,
  }
}

beforeAll(async () => {
  userA = await createTestUser(admin, 'ca')
  userB = await createTestUser(admin, 'cb')
  userC = await createTestUser(admin, 'cc')

  // A crea un grupo y B se une por invitación
  const g = await userA.client.rpc('create_group', { p_name: 'Comentarios Test' })
  group = must(g.data)
  orphanNuclei.push(group)
  const inv = await userA.client
    .from('invitations')
    .insert({ nucleus_id: group, created_by: userA.user.id })
    .select('token')
    .single()
  await userB.client.rpc('accept_invitation', { p_token: must(inv.data?.token) })

  // Tareas: una personal de A y una de grupo de A
  const personal = makeTaskRow(userA.user.id, { name: 'Personal A' })
  personalTaskId = personal.id
  await userA.client.from('tasks').insert(personal)
  const groupTask = makeTaskRow(userA.user.id, { name: 'Grupo A', nucleus_id: group })
  groupTaskId = groupTask.id
  await userA.client.from('tasks').insert(groupTask)
})

afterAll(async () => {
  for (const id of orphanNuclei) await deleteNucleus(admin, id)
  await admin.auth.admin.deleteUser(userA.user.id)
  await admin.auth.admin.deleteUser(userB.user.id)
  await admin.auth.admin.deleteUser(userC.user.id)
})

describe('RLS — comentarios (feature 017)', () => {
  it('personal: el dueño comenta y lo ve; otro no lo ve', async () => {
    const row = makeCommentRow(userA.user.id, personalTaskId)
    const inserted = await userA.client.from('comments').insert(row)
    expect(inserted.error).toBeNull()

    const asOwner = await userA.client.from('comments').select('id').eq('id', row.id)
    expect(asOwner.data).toHaveLength(1)

    const asOther = await userB.client.from('comments').select('id').eq('id', row.id)
    expect(asOther.data).toHaveLength(0)
  })

  it('nadie puede comentar en la tarea personal de otro (alta exige tarea visible)', async () => {
    const forged = makeCommentRow(userB.user.id, personalTaskId)
    const res = await userB.client.from('comments').insert(forged)
    expect(res.error?.code).toBe('42501')
  })

  it('grupo: un miembro comenta y todos los miembros lo ven; un extraño no', async () => {
    const row = makeCommentRow(userB.user.id, groupTaskId, { nucleus_id: group })
    const inserted = await userB.client.from('comments').insert(row)
    expect(inserted.error).toBeNull()

    const asMember = await userA.client.from('comments').select('id').eq('id', row.id)
    expect(asMember.data).toHaveLength(1)

    const asOutsider = await userC.client.from('comments').select('id').eq('id', row.id)
    expect(asOutsider.data).toHaveLength(0)
  })

  it('un extraño no puede comentar en una tarea de grupo ajeno', async () => {
    const forged = makeCommentRow(userC.user.id, groupTaskId, { nucleus_id: group })
    const res = await userC.client.from('comments').insert(forged)
    expect(res.error?.code).toBe('42501')
  })

  it('editar/borrar es solo del autor', async () => {
    // A deja un comentario en la tarea de grupo
    const row = makeCommentRow(userA.user.id, groupTaskId, { nucleus_id: group })
    aGroupCommentId = row.id
    await userA.client.from('comments').insert(row)

    // B (miembro, no autor) no puede editarlo: 0 filas afectadas
    const future = new Date(Date.now() + 60_000).toISOString()
    const edit = await userB.client
      .from('comments')
      .update({ body: 'secuestrado', updated_at: future })
      .eq('id', aGroupCommentId)
      .select()
    expect(edit.data ?? []).toHaveLength(0)

    // ...ni borrarlo
    const del = await userB.client.from('comments').delete().eq('id', aGroupCommentId).select()
    expect(del.data ?? []).toHaveLength(0)

    // el autor sí puede editar
    const own = await userA.client
      .from('comments')
      .update({ body: 'corregido', updated_at: future })
      .eq('id', aGroupCommentId)
      .select('body')
    expect(own.data?.[0]?.body).toBe('corregido')
  })
})
