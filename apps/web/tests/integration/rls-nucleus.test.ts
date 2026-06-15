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

// Feature 008 — aislamiento RLS con varios grupos por usuario
// (contracts/groups.md). Cubre: pertenecer a ≥2 grupos, aislamiento entre
// grupos, invariantes de invitación, abandonar uno conservando los demás y
// disolución del último miembro.

const admin: Client = adminClient()
let userA: TestUser
let userB: TestUser
let userC: TestUser
let group1: string
let group2: string
let cGroup: string
let task1Id: string
let task2Id: string
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
  await deleteTestUserSafe(userA)
  await deleteTestUserSafe(userB)
  await deleteTestUserSafe(userC)
})

async function deleteTestUserSafe(user: TestUser) {
  await admin.auth.admin.deleteUser(user.user.id)
}

async function inviteToken(group: string): Promise<string> {
  const created = await userA.client
    .from('invitations')
    .insert({ nucleus_id: group, created_by: userA.user.id })
    .select('token')
    .single()
  expect(created.error).toBeNull()
  return must(created.data?.token)
}

describe('RLS — varios grupos, aislamiento y disolución (feature 008)', () => {
  it('A crea un grupo y queda como primer miembro', async () => {
    const res = await userA.client.rpc('create_group', { p_name: 'Casa Test' })
    expect(res.error).toBeNull()
    group1 = must(res.data)
    orphanNuclei.push(group1)

    const visible = await userA.client.from('nuclei').select('name').eq('id', group1)
    expect(visible.data).toHaveLength(1)
  })

  it('A crea un SEGUNDO grupo y pertenece a ambos (FR-001/FR-002)', async () => {
    const res = await userA.client.rpc('create_group', { p_name: 'Viaje Test' })
    expect(res.error).toBeNull()
    group2 = must(res.data)
    orphanNuclei.push(group2)

    const nuclei = await userA.client.from('nuclei').select('id')
    expect(nuclei.data?.map((n) => n.id).sort()).toEqual([group1, group2].sort())

    const memberships = await userA.client.from('memberships').select('nucleus_id')
    expect(memberships.data?.map((m) => m.nucleus_id).sort()).toEqual(
      [group1, group2].sort(),
    )
  })

  it('B no ve un grupo ni sus tareas antes de unirse', async () => {
    const row = makeTaskRow(userA.user.id, { name: 'Tarea grupo 1', nucleus_id: group1 })
    task1Id = row.id
    const inserted = await userA.client.from('tasks').insert(row)
    expect(inserted.error).toBeNull()

    const nuclei = await userB.client.from('nuclei').select('id')
    const tasks = await userB.client.from('tasks').select('id').eq('id', task1Id)
    expect(nuclei.data).toHaveLength(0)
    expect(tasks.data).toHaveLength(0)
  })

  it('B no puede insertar tareas en un grupo ajeno (WITH CHECK)', async () => {
    const forged = makeTaskRow(userB.user.id, { nucleus_id: group1 })
    const res = await userB.client.from('tasks').insert(forged)
    expect(res.error?.code).toBe('42501')
  })

  it('B acepta una invitación a grupo 1 y pasa a verlo, con sus tareas y miembros', async () => {
    const accepted = await userB.client.rpc('accept_invitation', {
      p_token: await inviteToken(group1),
    })
    expect(accepted.error).toBeNull()
    expect(accepted.data).toBe(group1)

    const tasks = await userB.client.from('tasks').select('id').eq('id', task1Id)
    expect(tasks.data).toHaveLength(1)

    const members = await userB.client.from('memberships').select('user_id')
    expect(members.data?.map((m) => m.user_id).sort()).toEqual(
      [userA.user.id, userB.user.id].sort(),
    )
  })

  it('aislamiento entre grupos: B (solo en grupo 1) no ve las tareas del grupo 2', async () => {
    const row = makeTaskRow(userA.user.id, { name: 'Tarea grupo 2', nucleus_id: group2 })
    task2Id = row.id
    const inserted = await userA.client.from('tasks').insert(row)
    expect(inserted.error).toBeNull()

    const nuclei = await userB.client.from('nuclei').select('id').eq('id', group2)
    const tasks = await userB.client.from('tasks').select('id').eq('id', task2Id)
    expect(nuclei.data).toHaveLength(0)
    expect(tasks.data).toHaveLength(0)
  })

  it('C, que ya tiene su propio grupo, puede aceptar una invitación a grupo 1 (multi-grupo)', async () => {
    const own = await userC.client.rpc('create_group', { p_name: 'Casa de C' })
    expect(own.error).toBeNull()
    cGroup = must(own.data)
    orphanNuclei.push(cGroup)

    const accepted = await userC.client.rpc('accept_invitation', {
      p_token: await inviteToken(group1),
    })
    expect(accepted.error).toBeNull()

    const nuclei = await userC.client.from('nuclei').select('id')
    expect(nuclei.data?.map((n) => n.id).sort()).toEqual([group1, cGroup].sort())
  })

  it('C abandona grupo 1 y conserva su propio grupo (FR-015)', async () => {
    const left = await userC.client.rpc('leave_group', { p_nucleus_id: group1 })
    expect(left.error).toBeNull()

    const nuclei = await userC.client.from('nuclei').select('id')
    expect(nuclei.data?.map((n) => n.id)).toEqual([cGroup])
  })

  it('una invitación aceptada no puede reutilizarse (already_used)', async () => {
    const token = await inviteToken(group1)
    const first = await userC.client.rpc('accept_invitation', { p_token: token })
    expect(first.error).toBeNull()
    // C la deja de nuevo para no alterar el recuento de miembros de grupo 1
    await userC.client.rpc('leave_group', { p_nucleus_id: group1 })

    const again = await userC.client.rpc('accept_invitation', { p_token: token })
    expect(again.error?.message).toContain('already_used')
  })

  it('una invitación revocada no puede aceptarse (revoked)', async () => {
    const token = await inviteToken(group1)
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
      .insert({ nucleus_id: group1, created_by: userA.user.id, expires_at: past })
      .select('token')
      .single()

    const res = await userC.client.rpc('accept_invitation', {
      p_token: must(created.data?.token),
    })
    expect(res.error?.message).toContain('expired')
  })

  it('quien ya es miembro de un grupo no consume otra invitación (already_member)', async () => {
    const res = await userB.client.rpc('accept_invitation', {
      p_token: await inviteToken(group1),
    })
    expect(res.error?.message).toContain('already_member')
  })

  it('un miembro puede completar una tarea del grupo', async () => {
    const newer = new Date(Date.now() + 60_000).toISOString()
    const res = await userB.client
      .from('tasks')
      .update({ completed_at: '2026-06-15', completed_by: userB.user.id, updated_at: newer })
      .eq('id', task1Id)
      .select('completed_by')
      .single()

    expect(res.error).toBeNull()
    expect(res.data?.completed_by).toBe(userB.user.id)
  })

  it('al salir de grupo 1, B deja de verlo; el grupo sobrevive (queda A)', async () => {
    const left = await userB.client.rpc('leave_group', { p_nucleus_id: group1 })
    expect(left.error).toBeNull()

    const tasks = await userB.client.from('tasks').select('id').eq('id', task1Id)
    expect(tasks.data).toHaveLength(0)

    const stillThere = await admin.from('nuclei').select('id').eq('id', group1)
    expect(stillThere.data).toHaveLength(1)
  })

  it('abandonar un grupo del que no eres miembro da not_a_member', async () => {
    const res = await userB.client.rpc('leave_group', { p_nucleus_id: group1 })
    expect(res.error?.message).toContain('not_a_member')
  })

  it('el último miembro disuelve grupo 1; el otro grupo de A sobrevive (FR-016)', async () => {
    const left = await userA.client.rpc('leave_group', { p_nucleus_id: group1 })
    expect(left.error).toBeNull()

    const dissolved = await admin.from('nuclei').select('id').eq('id', group1)
    const tasks = await admin.from('tasks').select('id').eq('id', task1Id)
    expect(dissolved.data).toHaveLength(0)
    expect(tasks.data).toHaveLength(0)

    // El segundo grupo de A sigue intacto, con su tarea
    const survives = await userA.client.from('nuclei').select('id').eq('id', group2)
    const task2 = await userA.client.from('tasks').select('id').eq('id', task2Id)
    expect(survives.data).toHaveLength(1)
    expect(task2.data).toHaveLength(1)
  })
})
