// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import { createTask, isoDay, prontoList, yaList } from './ui'

test('crear una tarea la muestra inmediatamente y sobrevive a una recarga', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Cambiar filtro de la cocina')

  await expect(page.getByText('Cambiar filtro de la cocina')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Cambiar filtro de la cocina')).toBeVisible()
})

test('"Para hacer pronto" ordena las futuras por fecha ascendente (FR-004)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Tarea tardía', { date: isoDay(40) })
  await createTask(page, 'Tarea próxima', { date: isoDay(5) })
  await createTask(page, 'Tarea intermedia', { date: isoDay(20) })

  const items = prontoList(page).getByRole('listitem')
  await expect(items).toHaveCount(3)
  await expect(items.nth(0)).toContainText('Tarea próxima')
  await expect(items.nth(1)).toContainText('Tarea intermedia')
  await expect(items.nth(2)).toContainText('Tarea tardía')
})

test('una tarea creada sin conexión aparece igualmente (SC-002)', async ({
  page,
  context,
}) => {
  await page.goto('/')

  await context.setOffline(true)
  await createTask(page, 'Tarea sin red')

  await expect(page.getByText('Tarea sin red')).toBeVisible()
  await context.setOffline(false)
})

test('un nombre en blanco no crea la tarea y se informa al usuario (FR-002)', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.getByLabel('Fecha (opcional)').fill(isoDay(3))
  await page.getByRole('button', { name: 'Añadir tarea' }).click()

  await expect(page.getByRole('alert')).toContainText('El nombre es obligatorio')
  // El formulario sigue abierto (no se cerró ni reapareció el botón)
  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toHaveCount(0)
})

test('sin fecha va a "Para hacer ya"; con fecha futura va a "Para hacer pronto" (FR-002/FR-004)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Tarea urgente')
  await createTask(page, 'Tarea con fecha', { date: isoDay(10) })

  const ya = yaList(page).getByRole('listitem')
  await expect(ya).toHaveCount(1)
  await expect(ya.nth(0)).toContainText('Tarea urgente')
  await expect(ya.nth(0)).toContainText('Hacer ya')

  const pronto = prontoList(page).getByRole('listitem')
  await expect(pronto).toHaveCount(1)
  await expect(pronto.nth(0)).toContainText('Tarea con fecha')
})

test('una tarea de fecha pasada va a "Para hacer ya" resaltada como vencida (FR-003)', async ({
  page,
}) => {
  await page.goto('/')

  await createTask(page, 'Tarea vencida', { date: isoDay(-3) })

  const ya = yaList(page).getByRole('listitem')
  await expect(ya.nth(0)).toContainText('Tarea vencida')
  await expect(ya.nth(0)).toContainText('Vencida')
})
