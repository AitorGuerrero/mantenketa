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

// T023 — US2: crear núcleo → invitar → aceptar en otro navegador → lista de
// miembros en ambos; mensajes de revocada/caducada; abandono.

test.skip(!supabaseConfigured, 'requiere Supabase configurado en apps/web/.env.local')

test.describe.configure({ mode: 'serial' })

const NUCLEUS_NAME = `Casa E2E ${crypto.randomUUID().slice(0, 8)}`

let admin: Client
let userA: TestUser
let userB: TestUser
let contextB: BrowserContext
let pageB: Page
let invitationUrl: string

test.beforeAll(async ({ browser }) => {
  admin = adminClient()
  userA = await createTestUser(admin, 'inv-a')
  userB = await createTestUser(admin, 'inv-b')
  contextB = await browser.newContext()
  pageB = await contextB.newPage()
})

test.afterAll(async () => {
  await contextB.close()
  await admin.from('nuclei').delete().eq('name', NUCLEUS_NAME)
  await deleteTestUser(admin, userA)
  await deleteTestUser(admin, userB)
})

async function signIn(page: Page, user: TestUser) {
  await injectSession(page, user)
  await page.reload()
}

test('A crea el núcleo y genera una invitación', async ({ page }) => {
  await page.goto('/')
  await signIn(page, userA)

  await page.getByLabel('Nombre del núcleo').fill(NUCLEUS_NAME)
  await page.getByRole('button', { name: 'Crear núcleo' }).click()

  await expect(page.getByRole('heading', { name: NUCLEUS_NAME })).toBeVisible()
  await expect(page.getByLabel('Miembros del núcleo').getByRole('listitem')).toHaveCount(1)

  await page.getByRole('button', { name: 'Generar invitación' }).click()
  const urlInput = page.getByLabel('Enlace de invitación')
  await expect(urlInput).toBeVisible()
  invitationUrl = await urlInput.inputValue()
  expect(invitationUrl).toContain('/invitacion/')
})

test('B abre la invitación, inicia sesión, acepta y ambos ven dos miembros', async ({
  page,
}) => {
  const invitationPath = new URL(invitationUrl).pathname

  // Sin sesión: se le pide iniciar sesión primero
  await pageB.goto(invitationPath)
  await expect(
    pageB.getByRole('button', { name: 'Iniciar sesión con Google' }),
  ).toBeVisible()

  // Con sesión (inyectada): puede aceptar
  await signIn(pageB, userB)
  await pageB.getByRole('button', { name: 'Aceptar la invitación' }).click()
  await expect(pageB.getByText('¡Ya formas parte del núcleo!')).toBeVisible()

  // B ve el núcleo con dos miembros
  await pageB.goto('/')
  await expect(pageB.getByRole('heading', { name: NUCLEUS_NAME })).toBeVisible()
  await expect(pageB.getByLabel('Miembros del núcleo').getByRole('listitem')).toHaveCount(2)

  // A también, tras recargar
  await page.goto('/')
  await signIn(page, userA)
  await expect(page.getByLabel('Miembros del núcleo').getByRole('listitem')).toHaveCount(2)
})

test('una invitación revocada muestra su mensaje al aceptarla', async ({ page }) => {
  await page.goto('/')
  await signIn(page, userA)

  await page.getByRole('button', { name: 'Generar invitación' }).click()
  const url = await page.getByLabel('Enlace de invitación').inputValue()

  await page.getByRole('button', { name: 'Revocar' }).first().click()
  await expect(page.getByLabel('Enlace de invitación')).toHaveCount(0)

  await pageB.goto(new URL(url).pathname)
  await pageB.getByRole('button', { name: 'Aceptar la invitación' }).click()
  await expect(pageB.getByRole('alert')).toContainText('revocada')
})

test('una invitación caducada muestra su mensaje al aceptarla', async () => {
  const nucleus = await admin
    .from('nuclei')
    .select('id')
    .eq('name', NUCLEUS_NAME)
    .single()
  const created = await admin
    .from('invitations')
    .insert({
      nucleus_id: must(nucleus.data).id,
      created_by: userA.user.id,
      expires_at: new Date(Date.now() - 1000).toISOString(),
    })
    .select('token')
    .single()

  await pageB.goto(`/invitacion/${must(created.data).token}`)
  await pageB.getByRole('button', { name: 'Aceptar la invitación' }).click()
  await expect(pageB.getByRole('alert')).toContainText('caducado')
})

test('B abandona el núcleo y vuelve al estado sin núcleo; el núcleo sobrevive para A', async ({
  page,
}) => {
  await pageB.goto('/')
  pageB.once('dialog', (dialog) => void dialog.accept())
  await pageB.getByRole('button', { name: 'Abandonar el núcleo' }).click()

  await expect(pageB.getByRole('button', { name: 'Crear núcleo' })).toBeVisible()

  await page.goto('/')
  await signIn(page, userA)
  await expect(page.getByRole('heading', { name: NUCLEUS_NAME })).toBeVisible()
  await expect(page.getByLabel('Miembros del núcleo').getByRole('listitem')).toHaveCount(1)
})
