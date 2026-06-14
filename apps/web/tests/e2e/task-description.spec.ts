// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { devices, expect, test } from '@playwright/test'

import { createTask, yaList } from './ui'

test('crea una tarea con descripción multilínea y se muestra en la lista (FR-004, FR-006)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Cambiar filtro', {
    description: 'Filtro HEPA\nel del armario de la cocina',
  })

  const item = yaList(page).getByRole('listitem').filter({ hasText: 'Cambiar filtro' })
  await expect(item).toContainText('Filtro HEPA')
  await expect(item).toContainText('el del armario de la cocina')
  // sobrevive a una recarga
  await page.reload()
  await expect(
    yaList(page).getByRole('listitem').filter({ hasText: 'Cambiar filtro' }),
  ).toContainText('Filtro HEPA')
})

test('una tarea sin descripción no muestra descripción (FR-005)', async ({ page }) => {
  await page.goto('/')

  await createTask(page, 'Sin descripción')

  const item = yaList(page).getByRole('listitem').filter({ hasText: 'Sin descripción' })
  await expect(item).toBeVisible()
  await expect(item.locator('.task-description')).toHaveCount(0)
})

test('descripción de solo espacios se trata como vacía (FR-005)', async ({ page }) => {
  await page.goto('/')

  await createTask(page, 'Espacios', { description: '    ' })

  const item = yaList(page).getByRole('listitem').filter({ hasText: 'Espacios' })
  await expect(item.locator('.task-description')).toHaveCount(0)
})

test('en táctil, la tarjeta muestra la descripción', async ({ browser }) => {
  const ctx = await browser.newContext({ ...devices['Pixel 5'] })
  const page = await ctx.newPage()
  await page.goto('/')

  await createTask(page, 'Tarea con nota', { description: 'Comprar repuesto antes' })

  const card = page.getByRole('list', { name: 'Tarea actual' })
  await expect(card).toContainText('Tarea con nota')
  await expect(card).toContainText('Comprar repuesto antes')
  await ctx.close()
})
