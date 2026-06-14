// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, test } from '@playwright/test'

import { yaList } from './ui'

test('el formulario está oculto por defecto y "Nueva tarea" lo abre', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toBeVisible()
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible()
})

test('guardar una tarea válida la crea, cierra el formulario y aparece en su grupo', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('Tarea desde botón')
  await page.getByRole('button', { name: 'Añadir tarea' }).click()

  // El formulario se cierra (reaparece el botón) y la tarea está en "ya"
  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toBeVisible()
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveCount(0)
  await expect(yaList(page).getByRole('listitem')).toContainText('Tarea desde botón')
})

test('una entrada inválida mantiene el formulario abierto con el mensaje', async ({
  page,
}) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.getByRole('button', { name: 'Añadir tarea' }).click() // nombre vacío

  await expect(page.getByRole('alert')).toContainText('El nombre es obligatorio')
  await expect(page.getByLabel('Nombre', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toHaveCount(0)
})

test('cancelar cierra el formulario sin crear nada', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill('No guardar')
  await page.getByRole('button', { name: 'Cancelar' }).click()

  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toBeVisible()
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveCount(0)
  await expect(page.getByText('No guardar')).toHaveCount(0)
})
