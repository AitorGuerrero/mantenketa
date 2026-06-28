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
import { createTask, swipeRow, taskRow, yaList } from './ui'

// Feature 012 — asignar una tarea de grupo a un miembro. Requiere grupo (sesión
// + Supabase). Igual que nucleus-tasks: dos usuarios en un mismo núcleo.

test.skip(!supabaseConfigured, 'requiere Supabase configurado en apps/web/.env.local')

test.describe.configure({ mode: 'serial' })

const NUCLEUS_NAME = `Casa 012 ${crypto.randomUUID().slice(0, 8)}`

let admin: Client
let userA: TestUser
let userB: TestUser
let contextA: BrowserContext
let pageA: Page
let contextB: BrowserContext
let pageB: Page

test.beforeAll(async ({ browser }) => {
  admin = adminClient()
  userA = await createTestUser(admin, 'asg-a')
  userB = await createTestUser(admin, 'asg-b')

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

test('A asigna una tarea de grupo a B; ambos ven el asignado y a B le resalta (FR-001/005/006)', async () => {
  // A crea la tarea del grupo asignada a B (sin display name ⇒ etiqueta = email)
  await createTask(pageA, 'Pintar valla', { group: NUCLEUS_NAME, assignee: userB.email })

  // A ve "Asignada a <B>"
  const onA = taskRow(pageA, 'Pintar valla')
  await expect(onA).toContainText(`Asignada a ${userB.email}`)

  // B la recibe por Realtime: para B es "ti" y lleva el distintivo "Para mí"
  const onB = taskRow(pageB, 'Pintar valla')
  await expect(onB).toBeVisible({ timeout: 5000 })
  await expect(onB).toContainText('Asignada a ti')
  await expect(onB).toContainText('Para mí')
})

test('"Mis tareas" oculta a A la tarea asignada a B, pero la conserva a B (FR-007)', async () => {
  // A tiene además una personal (suya por definición)
  await createTask(pageA, 'Recado personal')

  await pageA.getByRole('checkbox', { name: 'Mis tareas' }).check()
  // La personal sigue; la de grupo asignada a B desaparece
  await expect(taskRow(pageA, 'Recado personal')).toBeVisible()
  await expect(taskRow(pageA, 'Pintar valla')).toHaveCount(0)
  await pageA.getByRole('checkbox', { name: 'Mis tareas' }).uncheck()

  // Para B, "Pintar valla" es suya ⇒ con "Mis tareas" sigue visible
  await pageB.getByRole('checkbox', { name: 'Mis tareas' }).check()
  await expect(taskRow(pageB, 'Pintar valla')).toBeVisible()
  await pageB.getByRole('checkbox', { name: 'Mis tareas' }).uncheck()
})

test('A reasigna la tarea a sí mismo al editar; deja de ser de B (FR-004)', async () => {
  const onA = taskRow(pageA, 'Pintar valla')
  await onA.click()
  await onA.getByRole('button', { name: 'Editar' }).click()
  await pageA.getByLabel('Asignar a').selectOption({ label: userA.email })
  await pageA.getByRole('button', { name: 'Guardar' }).click()

  // Ahora A es el asignado ("ti" + "Para mí")
  await expect(taskRow(pageA, 'Pintar valla')).toContainText('Para mí')

  // B recibe el cambio por Realtime: ya no es suya (sin "Para mí"), pasa a
  // "Asignada a <A>"
  const onB = taskRow(pageB, 'Pintar valla')
  await expect(onB).toContainText(`Asignada a ${userA.email}`, { timeout: 10000 })
  await expect(onB).not.toContainText('Para mí')
})

test('una tarea asignada a otra persona se atenúa y no se puede completar (feature 014)', async () => {
  // A crea una tarea de grupo asignada a B
  await createTask(pageA, 'Cosa de B', { group: NUCLEUS_NAME, assignee: userB.email })

  // Para A está asignada a otra persona ⇒ atenuada y bloqueada
  const onA = taskRow(pageA, 'Cosa de B')
  await expect(onA).toHaveClass(/task-item--others/)
  // Deslizar a la derecha no la completa: sigue pendiente en "ya"
  await swipeRow(pageA, onA, 'right')
  await expect(yaList(pageA).getByRole('listitem').filter({ hasText: 'Cosa de B' })).toHaveCount(1)
  await expect(onA).not.toContainText('Hecha')

  // Para B (su asignada) no se atenúa: es accionable y resaltada
  const onB = taskRow(pageB, 'Cosa de B')
  await expect(onB).toBeVisible({ timeout: 5000 })
  await expect(onB).not.toHaveClass(/task-item--others/)
  await expect(onB).toHaveClass(/task-item--mine/)
})
