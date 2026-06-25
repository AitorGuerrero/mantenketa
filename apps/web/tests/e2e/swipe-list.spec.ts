// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { devices, expect, test, type BrowserContext, type Page } from '@playwright/test'

import {
  completeTask,
  createTask,
  hechasList,
  isoDay,
  prontoList,
  revertTask,
  swipeRow,
  taskRow,
  yaList,
} from './ui'

// El deslizamiento sustituye al checkbox: es la única forma de completar/
// devolver en la lista. Funciona con ratón (escritorio) y con el dedo (táctil).
// El proyecto por defecto usa puntero fino (escritorio), donde "ya" y "pronto"
// son listas.

test.describe('deslizar para completar/devolver en la lista (ratón)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('deslizar una fila pendiente a la derecha la marca hecha (FR-001)', async ({ page }) => {
    await createTask(page, 'Deslizable en lista')
    await createTask(page, 'La otra')

    await completeTask(page, 'Deslizable en lista')

    await expect(hechasList(page).getByRole('listitem')).toContainText('Deslizable en lista')
    await expect(taskRow(yaList(page), 'Deslizable en lista')).toHaveCount(0)
    await expect(yaList(page).getByRole('listitem')).toContainText('La otra')
  })

  test('un arrastre corto no cruza el umbral, no completa (FR-002)', async ({ page }) => {
    await createTask(page, 'Corto')
    const row = taskRow(yaList(page), 'Corto')
    const box = await row.boundingBox()
    if (!box) throw new Error('sin fila')
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width / 2, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 40, y, { steps: 8 })
    await page.mouse.up()

    await expect(yaList(page).getByRole('listitem')).toContainText('Corto')
    await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
  })

  test('deslizar una pendiente a la izquierda no hace nada (FR-002)', async ({ page }) => {
    await createTask(page, 'Izquierda inocua')

    await swipeRow(page, taskRow(yaList(page), 'Izquierda inocua'), 'left')

    await expect(yaList(page).getByRole('listitem')).toContainText('Izquierda inocua')
    await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
  })

  test('una fila de "Para hacer pronto" también se completa al deslizar (FR-003)', async ({
    page,
  }) => {
    await createTask(page, 'Tarea futura', { date: isoDay(7) })

    await completeTask(page, 'Tarea futura')

    await expect(hechasList(page).getByRole('listitem')).toContainText('Tarea futura')
    await expect(taskRow(prontoList(page), 'Tarea futura')).toHaveCount(0)
  })

  test('deslizar una fila hecha a la izquierda la devuelve a pendiente (FR-004)', async ({
    page,
  }) => {
    await createTask(page, 'Devolver esta')
    await completeTask(page, 'Devolver esta')
    await expect(hechasList(page).getByRole('listitem')).toContainText('Devolver esta')

    await revertTask(page, 'Devolver esta')

    await expect(yaList(page).getByRole('listitem')).toContainText('Devolver esta')
    await expect(hechasList(page).getByRole('listitem')).toHaveCount(0)
  })

  test('deslizar una fila hecha a la derecha no la devuelve (FR-004)', async ({ page }) => {
    await createTask(page, 'Sigue hecha')
    await completeTask(page, 'Sigue hecha')
    await expect(hechasList(page).getByRole('listitem')).toContainText('Sigue hecha')

    await swipeRow(page, taskRow(hechasList(page), 'Sigue hecha'), 'right')

    await expect(hechasList(page).getByRole('listitem')).toContainText('Sigue hecha')
    await expect(yaList(page).getByRole('listitem')).toHaveCount(0)
  })
})

test('en táctil, deslizar también completa una fila de lista (paridad)', async ({ browser }) => {
  // En táctil "ya" es baraja; forzamos la lista para deslizar la fila
  const ctx: BrowserContext = await browser.newContext({ ...devices['Pixel 5'] })
  const page: Page = await ctx.newPage()
  await page.goto('/')

  await createTask(page, 'Táctil lista')
  await page.getByRole('button', { name: 'Ver como lista' }).click()

  await swipeRow(page, taskRow(yaList(page), 'Táctil lista'), 'right')

  await expect(hechasList(page).getByRole('listitem')).toContainText('Táctil lista')
  await ctx.close()
})
