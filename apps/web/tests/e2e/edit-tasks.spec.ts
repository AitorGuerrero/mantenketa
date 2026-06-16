// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { devices, expect, test, type BrowserContext, type Page } from '@playwright/test'

import { createTask, hechasList, isoDay, prontoList, yaList } from './ui'

// Feature 010 — editar tareas. Funciona en local/anónimo (no requiere sesión).

function row(page: Page, text: string) {
  return yaList(page).getByRole('listitem').filter({ hasText: text })
}

test('US1: editar nombre y urgente se refleja en la misma tarea (sin duplicar)', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Compra')

  await row(page, 'Compra').getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Comprar pan')
  await page.getByRole('checkbox', { name: 'Urgente', exact: true }).check()
  await page.getByRole('button', { name: 'Guardar' }).click()

  const edited = yaList(page).getByRole('listitem').filter({ hasText: 'Comprar pan' })
  await expect(edited).toHaveCount(1)
  await expect(edited).toContainText('Urgente')
  await expect(yaList(page).getByRole('listitem').filter({ hasText: /^Compra$/ })).toHaveCount(0)
})

test('US1: quitar la fecha mueve la tarea a "Para hacer ya"', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Con fecha', { date: isoDay(5) })
  await expect(prontoList(page).getByRole('listitem').filter({ hasText: 'Con fecha' })).toHaveCount(1)

  await prontoList(page)
    .getByRole('listitem')
    .filter({ hasText: 'Con fecha' })
    .getByRole('button', { name: 'Editar' })
    .click()
  await page.getByLabel('Fecha (opcional)').fill('')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(row(page, 'Con fecha')).toHaveCount(1)
})

test('US1: cancelar descarta los cambios', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Intacta')

  await row(page, 'Intacta').getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Cambiada')
  await page.getByRole('button', { name: 'Cancelar' }).click()

  await expect(row(page, 'Intacta')).toHaveCount(1)
  await expect(yaList(page).getByRole('listitem').filter({ hasText: 'Cambiada' })).toHaveCount(0)
})

test('US1: nombre en blanco se rechaza con el mensaje de validación', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Borrable')

  await row(page, 'Borrable').getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByRole('alert')).toContainText('nombre')
  // Cancelar deja la tarea como estaba
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await expect(row(page, 'Borrable')).toHaveCount(1)
})

test('US2: activar recurrencia al editar; al completar nace la sucesora', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Regar')

  await row(page, 'Regar').getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('checkbox', { name: 'Repetir', exact: true }).check()
  await page.getByLabel('Cada').fill('2')
  await page.getByLabel('Frecuencia').selectOption('weekly')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(row(page, 'Regar')).toContainText('cada 2 semanas')

  await page.getByRole('checkbox', { name: 'Regar' }).first().click()
  const successor = prontoList(page).getByRole('listitem').filter({ hasText: 'Regar' })
  await expect(successor).toHaveCount(1)
  await expect(successor).toContainText('cada 2 semanas')
})

test('US2: desactivar recurrencia; al completar no nace sucesora', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Riego', {
    recurrence: { interval: 1, freq: 'weekly', anchor: 'completion' },
  })

  await row(page, 'Riego').getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('checkbox', { name: 'Repetir', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(row(page, 'Riego')).not.toContainText('cada semana')

  await page.getByRole('checkbox', { name: 'Riego' }).first().click()
  await expect(prontoList(page).getByRole('listitem').filter({ hasText: 'Riego' })).toHaveCount(0)
})

test('US2: ancla "en la fecha prevista" sin fecha se rechaza', async ({ page }) => {
  await page.goto('/')
  await createTask(page, 'Sin fecha')

  await row(page, 'Sin fecha').getByRole('button', { name: 'Editar' }).click()
  await page.getByRole('checkbox', { name: 'Repetir', exact: true }).check()
  await page.getByLabel('Contar la próxima fecha').selectOption('dueDate')
  await page.getByRole('button', { name: 'Guardar' }).click()

  await expect(page.getByRole('alert')).toContainText('fecha')
})

test('US3: una tarea completada no ofrece "Editar"; al revertir reaparece', async ({
  page,
}) => {
  await page.goto('/')
  await createTask(page, 'Acabada')

  await page.getByRole('checkbox', { name: 'Acabada' }).click()
  const done = hechasList(page).getByRole('listitem').filter({ hasText: 'Acabada' })
  await expect(done).toBeVisible()
  await expect(done.getByRole('button', { name: 'Editar' })).toHaveCount(0)

  // Revertir (mismo checkbox) → vuelve a pendiente y reaparece "Editar"
  await page.getByRole('checkbox', { name: 'Acabada' }).click()
  await expect(row(page, 'Acabada').getByRole('button', { name: 'Editar' })).toBeVisible()
})

test.describe('edición en la baraja (puntero grueso)', () => {
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

  test('US3: "Editar" está en el dorso de la tarjeta y abre la edición', async () => {
    await createTask(page, 'Uno')
    await createTask(page, 'Dos')

    // De cara, "Editar" no es accesible; se voltea tocando la tarjeta
    const card = page.getByRole('list', { name: 'Tarea actual' })
    await card.getByText('Uno', { exact: true }).click()
    // En el dorso aparece el enlace Editar
    await page.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill('Uno editada')
    await page.getByRole('button', { name: 'Guardar' }).click()

    await expect(card).toContainText('Uno editada')
  })
})
