// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  makeTaskRow,
  type Client,
  type TestUser,
} from './helpers'

// Garantías 1 y 3 de contracts/backend.md: las tareas personales jamás
// cruzan usuarios, ni en lectura ni en escritura (Principio VIII).

const admin: Client = adminClient()
let userA: TestUser
let userB: TestUser
let taskId: string

beforeAll(async () => {
  userA = await createTestUser(admin, 'a')
  userB = await createTestUser(admin, 'b')

  const row = makeTaskRow(userA.user.id, { name: 'Personal de A' })
  taskId = row.id
  const inserted = await userA.client.from('tasks').insert(row)
  expect(inserted.error).toBeNull()
})

afterAll(async () => {
  await deleteTestUser(admin, userA)
  await deleteTestUser(admin, userB)
})

describe('RLS — tareas personales', () => {
  it('el dueño ve su tarea', async () => {
    const res = await userA.client.from('tasks').select('id').eq('id', taskId)

    expect(res.error).toBeNull()
    expect(res.data).toHaveLength(1)
  })

  it('otro usuario no ve la tarea (0 filas, no un error)', async () => {
    const res = await userB.client.from('tasks').select('id').eq('id', taskId)

    expect(res.error).toBeNull()
    expect(res.data).toHaveLength(0)
  })

  it('un cliente sin sesión no ve ninguna tarea', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const anon = createClient(
      process.env.VITE_SUPABASE_URL ?? '',
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
      { auth: { persistSession: false } },
    )

    const res = await anon.from('tasks').select('id')

    expect(res.data ?? []).toHaveLength(0)
  })

  it('otro usuario no puede modificar la tarea (la escritura no afecta a nada)', async () => {
    const futureStamp = new Date(Date.now() + 60_000).toISOString()
    const update = await userB.client
      .from('tasks')
      .update({ name: 'hackeada', updated_at: futureStamp })
      .eq('id', taskId)
      .select()

    expect(update.data ?? []).toHaveLength(0)

    const asOwner = await userA.client
      .from('tasks')
      .select('name')
      .eq('id', taskId)
      .single()
    expect(asOwner.data?.name).toBe('Personal de A')
  })

  it('nadie puede insertar una tarea con owner_id ajeno (WITH CHECK)', async () => {
    const forged = makeTaskRow(userA.user.id, { name: 'falsificada' })

    const res = await userB.client.from('tasks').insert(forged)

    expect(res.error).not.toBeNull()
    expect(res.error?.code).toBe('42501') // violación de policy RLS
  })

  it('el trigger LWW ignora escrituras con updated_at más antiguo', async () => {
    const older = new Date(Date.now() - 3_600_000).toISOString()
    const update = await userA.client
      .from('tasks')
      .update({ name: 'escritura vieja', updated_at: older })
      .eq('id', taskId)

    expect(update.error).toBeNull()

    const after = await userA.client
      .from('tasks')
      .select('name')
      .eq('id', taskId)
      .single()
    expect(after.data?.name).toBe('Personal de A')
  })

  it('el trigger LWW aplica escrituras con updated_at más nuevo', async () => {
    const newer = new Date(Date.now() + 60_000).toISOString()
    const update = await userA.client
      .from('tasks')
      .update({ name: 'Personal de A (editada)', updated_at: newer })
      .eq('id', taskId)

    expect(update.error).toBeNull()

    const after = await userA.client
      .from('tasks')
      .select('name')
      .eq('id', taskId)
      .single()
    expect(after.data?.name).toBe('Personal de A (editada)')
  })

  it('el dueño no puede cambiar la propiedad de una tarea (immutable_ownership)', async () => {
    const newer = new Date(Date.now() + 120_000).toISOString()
    const res = await userA.client
      .from('tasks')
      .update({ owner_id: userB.user.id, updated_at: newer })
      .eq('id', taskId)

    expect(res.error).not.toBeNull()
    expect(res.error?.message).toContain('immutable_ownership')
  })
})
