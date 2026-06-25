// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { devices, expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test'

import { createTask, hechasList, isoDay, prontoList, yaList } from './ui'

// El deslizamiento en la lista solo actúa con puntero grueso (táctil), igual que
// la baraja. Emulamos un móvil (Pixel 5) en su propio contexto.

// Arrastra una fila `row` horizontalmente `deltaX` px (derecha = +).
async function swipeRow(page: Page, row: Locator, deltaX: number) {
  const box = await row.boundingBox()
  if (!box) throw new Error('sin fila')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + deltaX, y, { steps: 8 })
  await page.mouse.up()
}

test.describe('deslizar para completar en la lista (puntero grueso)', () => {
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

  test('deslizar una fila pendiente a la derecha la marca hecha (FR-001)', async () => {
    await createTask(page, 'Deslizable en lista')
    await createTask(page, 'La otra')
    // "Para hacer ya" es baraja por defecto en táctil; forzamos la vista de lista
    await page.getByRole('button', { name: 'Ver como lista' }).click()

    const row = yaList(page).getByRole('listitem').filter({ hasText: 'Deslizable en lista' })
    await expect(row).toBeVisible()

    await swipeRow(page, row, 220)

    // Pasa a "Hechas" y sale de "ya" (la otra sigue en "ya")
    await expect(hechasList(page).getByRole('listitem')).toContainText('Deslizable en lista')
    await expect(
      yaList(page).getByRole('listitem').filter({ hasText: 'Deslizable en lista' }),
    ).toHaveCount(0)
    await expect(yaList(page).getByRole('listitem')).toContainText('La otra')
  })

  test('un arrastre corto a la derecha no completa (FR-002)', async () => {
    await createTask(page, 'No cruza el umbral')
    await page.getByRole('button', { name: 'Ver como lista' }).click()

    const row = yaList(page).getByRole('listitem').filter({ hasText: 'No cruza el umbral' })
    await swipeRow(page, row, 40)

    await expect(yaList(page).getByRole('listitem')).toContainText('No cruza el umbral')
    await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
  })

  test('deslizar a la izquierda no hace nada (FR-002)', async () => {
    await createTask(page, 'Izquierda inocua')
    await page.getByRole('button', { name: 'Ver como lista' }).click()

    const row = yaList(page).getByRole('listitem').filter({ hasText: 'Izquierda inocua' })
    await swipeRow(page, row, -220)

    await expect(yaList(page).getByRole('listitem')).toContainText('Izquierda inocua')
    await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
  })

  test('una fila de "Para hacer pronto" también se completa al deslizar (FR-003)', async () => {
    await createTask(page, 'Tarea futura', { date: isoDay(7) })

    const row = prontoList(page).getByRole('listitem').filter({ hasText: 'Tarea futura' })
    await expect(row).toBeVisible()

    await swipeRow(page, row, 220)

    await expect(hechasList(page).getByRole('listitem')).toContainText('Tarea futura')
    await expect(
      prontoList(page).getByRole('listitem').filter({ hasText: 'Tarea futura' }),
    ).toHaveCount(0)
  })

  test('una tarea hecha no se puede completar deslizando (FR-003)', async () => {
    await createTask(page, 'Ya hecha', { date: isoDay(7) })
    // Completar desde "pronto" con el checkbox para que pase a "Hechas"
    await page.getByRole('checkbox', { name: 'Ya hecha' }).click()

    const row = hechasList(page).getByRole('listitem').filter({ hasText: 'Ya hecha' })
    await expect(row).toBeVisible()
    // Deslizar a la derecha no debe revertir ni mover la fila hecha
    await swipeRow(page, row, 220)
    await expect(hechasList(page).getByRole('listitem')).toContainText('Ya hecha')
    await expect(page.getByRole('checkbox', { name: 'Ya hecha' })).toBeChecked()
  })
})

test('en escritorio (puntero fino) la lista no es deslizable (FR-007)', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'En escritorio')

  const row = yaList(page).getByRole('listitem').filter({ hasText: 'En escritorio' })
  await expect(row).toBeVisible()

  await swipeRow(page, row, 220)

  // Sigue en "ya": el gesto no completa en escritorio
  await expect(yaList(page).getByRole('listitem')).toContainText('En escritorio')
  await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
})
