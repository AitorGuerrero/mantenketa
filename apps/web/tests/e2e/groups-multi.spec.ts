// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test, type Page } from '@playwright/test'

import {
  adminClient,
  createTestUser,
  deleteTestUser,
  type Client,
  type TestUser,
} from '../integration/helpers'

import { injectSession, supabaseConfigured } from './session'
import { createTask, yaList } from './ui'

// Feature 008 — US1 (pertenecer a varios grupos) + US2 (vista unificada con
// etiqueta de ámbito y creación por defecto personal).

test.skip(!supabaseConfigured, 'requiere Supabase configurado en apps/web/.env.local')

test.describe.configure({ mode: 'serial' })

const SUFFIX = crypto.randomUUID().slice(0, 8)
const CASA = `Casa ${SUFFIX}`
const VIAJE = `Viaje ${SUFFIX}`

let admin: Client
let userA: TestUser

test.beforeAll(async () => {
  admin = adminClient()
  userA = await createTestUser(admin, 'multi-a')
})

test.afterAll(async () => {
  await admin.from('nuclei').delete().eq('name', CASA)
  await admin.from('nuclei').delete().eq('name', VIAJE)
  await deleteTestUser(admin, userA)
})

async function createGroup(page: Page, name: string) {
  await page.getByLabel('Nombre del grupo').fill(name)
  await page.getByRole('button', { name: 'Crear grupo' }).click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test('un usuario crea dos grupos y pertenece a ambos a la vez (US1)', async ({ page }) => {
  await page.goto('/')
  await injectSession(page, userA)
  await page.reload()
  await expect(page.getByText(userA.email)).toBeVisible()

  await createGroup(page, CASA)
  await createGroup(page, VIAJE)

  // Ambos grupos listados; el formulario de crear sigue disponible
  await expect(page.getByRole('heading', { name: CASA })).toBeVisible()
  await expect(page.getByRole('heading', { name: VIAJE })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Crear grupo' })).toBeVisible()
})

test('la home muestra todo junto con etiqueta de ámbito; por defecto personal (US2)', async ({
  page,
}) => {
  await page.goto('/')
  await injectSession(page, userA)
  await page.reload()

  // Por defecto, personal
  await createTask(page, 'Comprar pan')
  // Elegir explícitamente cada grupo
  await createTask(page, 'Pagar luz', { group: CASA })
  await createTask(page, 'Reservar hotel', { group: VIAJE })

  const personal = yaList(page).getByRole('listitem').filter({ hasText: 'Comprar pan' })
  const casa = yaList(page).getByRole('listitem').filter({ hasText: 'Pagar luz' })
  const viaje = yaList(page).getByRole('listitem').filter({ hasText: 'Reservar hotel' })

  await expect(personal).toContainText('Personal')
  await expect(casa).toContainText(CASA)
  await expect(viaje).toContainText(VIAJE)
})
