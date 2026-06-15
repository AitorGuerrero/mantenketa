// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { devices, expect, test, type BrowserContext, type Page } from '@playwright/test'

import { createTask, hechasList } from './ui'

const front = (page: Page) => page.getByRole('list', { name: 'Tarea actual' })
const back = (page: Page) => page.getByRole('region', { name: 'Descripción de la tarea' })

test.describe('volteo de la tarjeta (táctil)', () => {
  let ctx: BrowserContext
  let page: Page

  test.beforeEach(async ({ browser }) => {
    ctx = await browser.newContext({ ...devices['Pixel 5'] })
    page = await ctx.newPage()
    await page.goto('/')
  })
  test.afterEach(async () => {
    await ctx.close()
  })

  test('tocar voltea y muestra la descripción; tocar de nuevo vuelve al frente (FR-001..003)', async () => {
    await createTask(page, 'Cambiar filtro', { description: 'Filtro HEPA del armario' })

    // De cara: frente visible, dorso oculto (aria-hidden)
    await expect(front(page)).toBeVisible()
    await expect(back(page)).toHaveCount(0)

    // Tocar → voltea: dorso con la descripción, frente oculto
    await page.locator('.task-card').click()
    await expect(back(page)).toContainText('Filtro HEPA del armario')
    await expect(front(page)).toHaveCount(0)

    // Tocar de nuevo → vuelve al frente
    await page.locator('.task-card').click()
    await expect(front(page)).toBeVisible()
    await expect(back(page)).toHaveCount(0)
  })

  test('deslizar a la derecha sigue completando, no solo voltea (FR-004)', async () => {
    await createTask(page, 'Deslizable', { description: 'algo' })

    const box = await page.locator('.task-card').boundingBox()
    if (!box) throw new Error('sin tarjeta')
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 220, y, { steps: 8 })
    await page.mouse.up()

    await expect(hechasList(page)).toContainText('Deslizable')
  })

  test('al avanzar, la siguiente tarjeta se muestra de cara (FR-005)', async () => {
    await createTask(page, 'Primera', { description: 'desc 1' })
    await createTask(page, 'Segunda', { description: 'desc 2' })

    // Voltear la primera
    await page.locator('.task-card').click()
    await expect(back(page)).toContainText('desc 1')

    // Posponer (botón) → avanza a la segunda, que sale de cara
    await page.getByRole('button', { name: 'Posponer' }).click()
    await expect(front(page)).toContainText('Segunda')
    await expect(back(page)).toHaveCount(0)
  })

  test('una tarea sin descripción voltea a "Sin descripción" (FR-006)', async () => {
    await createTask(page, 'Sin nota')

    await page.locator('.task-card').click()
    await expect(back(page)).toContainText('Sin descripción')
  })
})
