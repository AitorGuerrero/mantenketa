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
import { createTask, taskRow, yaList } from './ui'

// Feature 013 — proyectos. Requiere sesión + Supabase (entidad como los grupos).
// Dos usuarios en un mismo núcleo, igual que assign-tasks/nucleus-tasks.

test.skip(!supabaseConfigured, 'requiere Supabase configurado en apps/web/.env.local')

test.describe.configure({ mode: 'serial' })

const NUCLEUS_NAME = `Casa 013 ${crypto.randomUUID().slice(0, 8)}`

let admin: Client
let userA: TestUser
let userB: TestUser
let contextA: BrowserContext
let pageA: Page
let contextB: BrowserContext
let pageB: Page

/** Crea un proyecto desde el panel de Proyectos y espera a que aparezca. */
async function createProjectUI(page: Page, name: string, scopeLabel: string) {
  const panel = page.getByRole('region', { name: 'Proyectos' })
  await panel.getByLabel('Nombre del proyecto').fill(name)
  await panel.getByLabel('Ámbito del proyecto').selectOption({ label: scopeLabel })
  await panel.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(panel.getByText(`📁 ${name}`)).toBeVisible()
}

test.beforeAll(async ({ browser }) => {
  admin = adminClient()
  userA = await createTestUser(admin, 'prj-a')
  userB = await createTestUser(admin, 'prj-b')

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

  await pageA.goto('/')
  await injectSession(pageA, userA)
  await pageA.reload()
  await expect(pageA.getByText(userA.email)).toBeVisible()

  await pageB.goto('/')
  await injectSession(pageB, userB)
  await pageB.reload()
  await expect(pageB.getByText(userB.email)).toBeVisible()
})

test.afterAll(async () => {
  await contextA.close()
  await contextB.close()
  await admin.from('nuclei').delete().eq('name', NUCLEUS_NAME)
  await deleteTestUser(admin, userA)
  await deleteTestUser(admin, userB)
})

test('un proyecto personal agrupa tareas y se filtra por él (FR-001/005/006)', async () => {
  await createProjectUI(pageA, 'Arreglar la cocina', 'Personal')

  // Tarea dentro del proyecto y otra fuera
  await createTask(pageA, 'Hablar con el arquitecto', { project: 'Arreglar la cocina' })
  await createTask(pageA, 'Recado suelto')

  await expect(taskRow(pageA, 'Hablar con el arquitecto')).toContainText('Arreglar la cocina')

  // Filtrar por el proyecto deja solo sus tareas
  await pageA.getByRole('combobox', { name: 'Filtrar por proyecto' }).selectOption({
    label: 'Arreglar la cocina',
  })
  await expect(yaList(pageA).getByRole('listitem')).toContainText('Hablar con el arquitecto')
  await expect(
    yaList(pageA).getByRole('listitem').filter({ hasText: 'Recado suelto' }),
  ).toHaveCount(0)
  // Volver a "todos"
  await pageA
    .getByRole('combobox', { name: 'Filtrar por proyecto' })
    .selectOption({ label: 'Todos los proyectos' })
})

test('quitar el proyecto al editar elimina el badge (FR-004)', async () => {
  const row = taskRow(pageA, 'Hablar con el arquitecto')
  await row.getByRole('button', { name: 'Editar' }).click()
  await pageA.getByLabel('Proyecto', { exact: true }).selectOption({ label: 'Sin proyecto' })
  await pageA.getByRole('button', { name: 'Guardar' }).click()

  await expect(taskRow(pageA, 'Hablar con el arquitecto')).not.toContainText('Arreglar la cocina')
})

test('un proyecto de grupo y sus tareas se ven en otro miembro (FR-002)', async () => {
  await createProjectUI(pageA, 'Viaje familiar', NUCLEUS_NAME)
  await createTask(pageA, 'Reservar hotel', {
    group: NUCLEUS_NAME,
    project: 'Viaje familiar',
  })
  await expect(taskRow(pageA, 'Reservar hotel')).toContainText('Viaje familiar')

  // B recibe la tarea por Realtime; tras recargar (refresca proyectos) ve el badge
  await expect(taskRow(pageB, 'Reservar hotel')).toBeVisible({ timeout: 5000 })
  await pageB.reload()
  await expect(taskRow(pageB, 'Reservar hotel')).toContainText('Viaje familiar')
})
