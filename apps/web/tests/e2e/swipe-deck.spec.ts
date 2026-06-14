// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { devices, expect, test, type BrowserContext, type Page } from '@playwright/test'

import { createTask, hechasList, prontoList, yaList } from './ui'

// La baraja solo aparece con puntero grueso (táctil). Emulamos un móvil
// (Pixel 5: hasTouch + isMobile ⇒ pointer: coarse) en su propio contexto,
// dejando el proyecto de escritorio (fine pointer) para el resto de specs.

const deck = (page: Page) => page.getByRole('list', { name: 'Tarea actual' })

test.describe('baraja en táctil (puntero grueso)', () => {
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

  test('"Para hacer ya" se muestra como una tarjeta, no como lista', async () => {
    await createTask(page, 'Primera')
    await createTask(page, 'Segunda')

    // Hay tarjeta (lista "Tarea actual") con una sola tarea, y NO la lista normal de "ya"
    await expect(deck(page).getByRole('listitem')).toHaveCount(1)
    await expect(page.getByRole('list', { name: 'Tareas para hacer ya' })).toHaveCount(0)
  })

  test('la pila muestra cartas asomando detrás y los botones llevan flechas (FR-014, FR-017)', async () => {
    await createTask(page, 'Primera')
    await createTask(page, 'Segunda')
    await createTask(page, 'Tercera')

    // Activa (1) + al menos 2 asomando detrás
    await expect(deck(page).getByRole('listitem')).toHaveCount(1)
    await expect(page.locator('.task-card-peek')).toHaveCount(2)

    // Flechas en los botones de acción
    await expect(page.getByRole('button', { name: 'Posponer' })).toContainText('←')
    await expect(page.getByRole('button', { name: 'Hecha' })).toContainText('→')
  })

  test('"Ver como lista" fuerza la vista de lista en táctil', async () => {
    await createTask(page, 'En la baraja')

    await expect(deck(page)).toBeVisible()
    await page.getByRole('button', { name: 'Ver como lista' }).click()

    // Ya no hay baraja: "Para hacer ya" pasa a ser lista
    await expect(page.getByRole('list', { name: 'Tarea actual' })).toHaveCount(0)
    await expect(yaList(page)).toContainText('En la baraja')
  })

  test('"Hecha" completa la tarjeta y avanza a la siguiente (FR-002)', async () => {
    await createTask(page, 'Primera')
    await createTask(page, 'Segunda')

    await expect(deck(page)).toContainText('Primera')
    await page.getByRole('button', { name: 'Hecha' }).click()

    // Avanza a la siguiente y la primera aparece en "Hechas recientemente"
    await expect(deck(page)).toContainText('Segunda')
    await expect(deck(page)).not.toContainText('Primera')
    await expect(hechasList(page)).toContainText('Primera')
  })

  test('"Posponer" manda la tarjeta al final y avanza (FR-003)', async () => {
    await createTask(page, 'Primera')
    await createTask(page, 'Segunda')

    await expect(deck(page)).toContainText('Primera')
    await page.getByRole('button', { name: 'Posponer' }).click()
    await expect(deck(page)).toContainText('Segunda')

    // Posponer la segunda vuelve a la primera (ciclo)
    await page.getByRole('button', { name: 'Posponer' }).click()
    await expect(deck(page)).toContainText('Primera')
  })

  test('con una sola tarjeta, posponer la deja igual (FR-006)', async () => {
    await createTask(page, 'Única')

    await expect(deck(page)).toContainText('Única')
    await page.getByRole('button', { name: 'Posponer' }).click()
    await expect(deck(page)).toContainText('Única')
  })

  test('baraja vacía muestra "¡Todo al día!" y deja ver las listas debajo (FR-005, FR-008)', async () => {
    await expect(page.getByText('¡Todo al día!')).toBeVisible()

    await createTask(page, 'Tarea futura', { date: futureDay() })
    await expect(prontoList(page)).toContainText('Tarea futura')
  })

  test('deslizar a la derecha completa la tarjeta (gesto real, FR-002)', async () => {
    await createTask(page, 'Deslizable')
    const card = deck(page)
    await expect(card).toContainText('Deslizable')

    const box = await page.locator('.task-card').boundingBox()
    if (!box) throw new Error('sin tarjeta')
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 200, y, { steps: 8 })
    await page.mouse.up()

    await expect(hechasList(page)).toContainText('Deslizable')
  })
})

test('en escritorio (puntero fino) "Para hacer ya" sigue siendo lista, sin baraja (FR-009, SC-004)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'En escritorio')

  await expect(yaList(page)).toContainText('En escritorio')
  await expect(page.getByRole('list', { name: 'Tarea actual' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Hecha' })).toHaveCount(0)
})

function futureDay(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${String(d.getFullYear())}-${m}-${day}`
}
