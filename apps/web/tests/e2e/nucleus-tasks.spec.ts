// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  must,
  type Client,
  type TestUser,
} from '../integration/helpers'

import { injectSession, supabaseConfigured } from './session'
import { createTask, isoDay } from './ui'

// T024 — US3: una tarea del núcleo creada por A aparece en B ≤ 5 s sin
// recargar (Realtime, SC-003); B la completa y A ve quién la hizo (FR-016);
// las personales nunca cruzan (FR-014).

test.skip(!supabaseConfigured, 'requiere Supabase configurado en apps/web/.env.local')

test.describe.configure({ mode: 'serial' })

const NUCLEUS_NAME = `Casa US3 ${crypto.randomUUID().slice(0, 8)}`

let admin: Client
let userA: TestUser
let userB: TestUser
let contextA: BrowserContext
let pageA: Page
let contextB: BrowserContext
let pageB: Page

test.beforeAll(async ({ browser }) => {
  admin = adminClient()
  userA = await createTestUser(admin, 'us3-a')
  userB = await createTestUser(admin, 'us3-b')

  // Grupo de dos miembros, montado por la vía rápida (la UI ya la cubre)
  const nucleus = await userA.client.rpc('create_group', { p_name: NUCLEUS_NAME })
  if (nucleus.error) throw new Error(nucleus.error.message)
  const invitation = await userA.client
    .from('invitations')
    .insert({ nucleus_id: must(nucleus.data), created_by: userA.user.id })
    .select('token')
    .single()
  const accepted = await userB.client.rpc('accept_invitation', {
    p_token: must(invitation.data).token,
  })
  if (accepted.error) throw new Error(accepted.error.message)

  contextA = await browser.newContext()
  pageA = await contextA.newPage()
  contextB = await browser.newContext()
  pageB = await contextB.newPage()
})

test.afterAll(async () => {
  await contextA.close()
  await contextB.close()
  await admin.from('nuclei').delete().eq('name', NUCLEUS_NAME)
  await deleteTestUser(admin, userA)
  await deleteTestUser(admin, userB)
})

test('una tarea del núcleo creada por A aparece en B sin recargar (SC-003) y las personales no cruzan (FR-014)', async () => {
  // Ambos miembros con la app abierta
  await pageA.goto('/')
  await injectSession(pageA, userA)
  await pageA.reload()
  await expect(pageA.getByText(userA.email)).toBeVisible()

  await pageB.goto('/')
  await injectSession(pageB, userB)
  await pageB.reload()
  await expect(pageB.getByText(userB.email)).toBeVisible()

  // A crea una tarea personal (por defecto) y una del grupo
  await createTask(pageA, 'Solo mía', { date: isoDay(11) })
  await createTask(pageA, 'Comprar bombillas', { date: isoDay(6), group: NUCLEUS_NAME })

  // B la ve sin recargar, en ≤ 5 s (Realtime), etiquetada con el nombre del grupo
  const shared = pageB.getByRole('listitem').filter({ hasText: 'Comprar bombillas' })
  await expect(shared).toBeVisible({ timeout: 5000 })
  await expect(shared).toContainText(NUCLEUS_NAME)
  // Tarea de grupo: se ve quién la creó (A, mostrado por su email al no tener nombre)
  await expect(shared).toContainText(`Creada por ${userA.email}`)

  // La personal de A nunca aparece en B
  await expect(pageB.getByText('Solo mía')).toHaveCount(0)

  // La personal (no de grupo) no muestra "Creada por"
  const mine = pageA.getByRole('listitem').filter({ hasText: 'Solo mía' })
  await expect(mine).not.toContainText('Creada por')
})

test('B la marca hecha y A ve quién la completó sin recargar (FR-016)', async () => {
  await pageB.getByRole('checkbox', { name: 'Comprar bombillas' }).click()
  await expect(pageB.getByText(`Completada por ${userB.email}`)).toBeVisible()

  // A recibe el cambio por Realtime: completada y con autor
  await expect(pageA.getByText(`Completada por ${userB.email}`)).toBeVisible({
    timeout: 5000,
  })
})
