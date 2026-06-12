// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  adminClient,
  createTestUser,
  deleteNucleus,
  deleteTestUser,
  makeTaskRow,
  type Client,
  type TestUser,
} from './helpers'

// Garantías 2, 4 y 5 de contracts/backend.md: visibilidad de núcleo en sus
// transiciones (antes/después de unirse/salir), invariantes de invitación
// (un solo uso, revocada, caducada) y disolución del último miembro.

const admin: Client = adminClient()
let userA: TestUser
let userB: TestUser
let userC: TestUser
let nucleusId: string
let nucleusTaskId: string
const orphanNuclei: string[] = []

beforeAll(async () => {
  userA = await createTestUser(admin, 'na')
  userB = await createTestUser(admin, 'nb')
  userC = await createTestUser(admin, 'nc')
})

afterAll(async () => {
  for (const id of orphanNuclei) {
    await deleteNucleus(admin, id)
  }
  await deleteTestUser(admin, userA)
  await deleteTestUser(admin, userB)
  await deleteTestUser(admin, userC)
})

describe('RLS — núcleo, invitaciones y disolución', () => {
  it('A crea un núcleo y queda como primer miembro', async () => {
    const res = await userA.client.rpc('create_nucleus', { p_name: 'Casa Test' })

    expect(res.error).toBeNull()
    nucleusId = res.data as string
    orphanNuclei.push(nucleusId)

    const visible = await userA.client.from('nuclei').select('name').eq('id', nucleusId)
    expect(visible.data).toHaveLength(1)
  })

  it('A no puede crear un segundo núcleo (already_in_nucleus)', async () => {
    const res = await userA.client.rpc('create_nucleus', { p_name: 'Otra casa' })

    expect(res.error?.message).toContain('already_in_nucleus')
  })

  it('B no ve el núcleo ni sus tareas antes de unirse', async () => {
    const row = makeTaskRow(userA.user.id, {
      name: 'Tarea del núcleo',
      nucleus_id: nucleusId,
    })
    nucleusTaskId = row.id
    const inserted = await userA.client.from('tasks').insert(row)
    expect(inserted.error).toBeNull()

    const nuclei = await userB.client.from('nuclei').select('id')
    const tasks = await userB.client.from('tasks').select('id').eq('id', nucleusTaskId)
    expect(nuclei.data).toHaveLength(0)
    expect(tasks.data).toHaveLength(0)
  })

  it('B no puede insertar tareas en un núcleo ajeno (WITH CHECK)', async () => {
    const forged = makeTaskRow(userB.user.id, { nucleus_id: nucleusId })

    const res = await userB.client.from('tasks').insert(forged)

    expect(res.error?.code).toBe('42501')
  })

  it('B acepta una invitación y pasa a ver el núcleo, sus tareas y sus miembros', async () => {
    const invitation = await userA.client
      .from('invitations')
      .insert({ nucleus_id: nucleusId, created_by: userA.user.id })
      .select('token')
      .single()
    expect(invitation.error).toBeNull()
    const token = invitation.data?.token as string

    const accepted = await userB.client.rpc('accept_invitation', { p_token: token })
    expect(accepted.error).toBeNull()
    expect(accepted.data).toBe(nucleusId)

    const tasks = await userB.client.from('tasks').select('id').eq('id', nucleusTaskId)
    expect(tasks.data).toHaveLength(1)

    const members = await userB.client.from('memberships').select('user_id')
    expect(members.data?.map((m) => m.user_id).sort()).toEqual(
      [userA.user.id, userB.user.id].sort(),
    )

    const profiles = await userB.client.from('profiles').select('id')
    expect(profiles.data?.length).toBe(2)
  })

  it('una invitación aceptada no puede reutilizarse (already_used)', async () => {
    const invitation = await userA.client
      .from('invitations')
      .select('token')
      .eq('nucleus_id', nucleusId)
      .eq('status', 'accepted')
      .single()

    const again = await userC.client.rpc('accept_invitation', {
      p_token: invitation.data?.token as string,
    })

    expect(again.error?.message).toContain('already_used')
  })

  it('una invitación revocada no puede aceptarse (revoked)', async () => {
    const created = await userA.client
      .from('invitations')
      .insert({ nucleus_id: nucleusId, created_by: userA.user.id })
      .select('token')
      .single()
    const token = created.data?.token as string

    const revoked = await userA.client
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('token', token)
    expect(revoked.error).toBeNull()

    const res = await userC.client.rpc('accept_invitation', { p_token: token })
    expect(res.error?.message).toContain('revoked')
  })

  it('una invitación caducada no puede aceptarse (expired)', async () => {
    const past = new Date(Date.now() - 1000).toISOString()
    const created = await userA.client
      .from('invitations')
      .insert({ nucleus_id: nucleusId, created_by: userA.user.id, expires_at: past })
      .select('token')
      .single()

    const res = await userC.client.rpc('accept_invitation', {
      p_token: created.data?.token as string,
    })

    expect(res.error?.message).toContain('expired')
  })

  it('quien ya tiene núcleo no puede aceptar otra invitación (already_in_nucleus)', async () => {
    const own = await userC.client.rpc('create_nucleus', { p_name: 'Casa de C' })
    expect(own.error).toBeNull()
    orphanNuclei.push(own.data as string)

    const created = await userA.client
      .from('invitations')
      .insert({ nucleus_id: nucleusId, created_by: userA.user.id })
      .select('token')
      .single()

    const res = await userC.client.rpc('accept_invitation', {
      p_token: created.data?.token as string,
    })

    expect(res.error?.message).toContain('already_in_nucleus')
  })

  it('un miembro puede completar una tarea del núcleo', async () => {
    const newer = new Date(Date.now() + 60_000).toISOString()
    const res = await userB.client
      .from('tasks')
      .update({
        completed_at: '2026-06-12',
        completed_by: userB.user.id,
        updated_at: newer,
      })
      .eq('id', nucleusTaskId)
      .select('completed_by')
      .single()

    expect(res.error).toBeNull()
    expect(res.data?.completed_by).toBe(userB.user.id)
  })

  it('al salir, B deja de ver el núcleo; el núcleo sobrevive (queda A)', async () => {
    const left = await userB.client.rpc('leave_nucleus')
    expect(left.error).toBeNull()

    const tasks = await userB.client.from('tasks').select('id').eq('id', nucleusTaskId)
    expect(tasks.data).toHaveLength(0)

    const stillThere = await admin.from('nuclei').select('id').eq('id', nucleusId)
    expect(stillThere.data).toHaveLength(1)
  })

  it('salir sin núcleo da no_nucleus', async () => {
    const res = await userB.client.rpc('leave_nucleus')

    expect(res.error?.message).toContain('no_nucleus')
  })

  it('el último miembro disuelve el núcleo: tareas e invitaciones desaparecen (FR-013)', async () => {
    const left = await userA.client.rpc('leave_nucleus')
    expect(left.error).toBeNull()

    const nuclei = await admin.from('nuclei').select('id').eq('id', nucleusId)
    const tasks = await admin.from('tasks').select('id').eq('id', nucleusTaskId)
    const invitations = await admin
      .from('invitations')
      .select('token')
      .eq('nucleus_id', nucleusId)

    expect(nuclei.data).toHaveLength(0)
    expect(tasks.data).toHaveLength(0)
    expect(invitations.data).toHaveLength(0)
  })
})
