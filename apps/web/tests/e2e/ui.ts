// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { expect, type Locator, type Page } from '@playwright/test'

/** Día local en YYYY-MM-DD desplazado `offset` días desde hoy (para tests deterministas). */
export function isoDay(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${String(d.getFullYear())}-${m}-${day}`
}

/** Abre el formulario con "Nueva tarea", crea una tarea y espera a que se cierre. */
export async function createTask(
  page: Page,
  name: string,
  opts: { date?: string; scope?: 'personal' | 'nucleus'; description?: string } = {},
): Promise<void> {
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill(name)
  if (opts.date !== undefined) {
    await page.getByLabel('Fecha (opcional)').fill(opts.date)
  }
  if (opts.description !== undefined) {
    await page.getByLabel('Descripción (opcional)').fill(opts.description)
  }
  if (opts.scope === 'nucleus') {
    await page.getByRole('radio', { name: 'Del núcleo' }).check()
  }
  await page.getByRole('button', { name: 'Añadir tarea' }).click()
  // Al guardar con éxito el formulario se cierra y reaparece el botón
  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toBeVisible()
}

export function yaList(page: Page): Locator {
  return page.getByRole('list', { name: 'Tareas para hacer ya' })
}

export function prontoList(page: Page): Locator {
  return page.getByRole('list', { name: 'Tareas para hacer pronto' })
}

export function hechasList(page: Page): Locator {
  return page.getByRole('list', { name: 'Tareas hechas recientemente' })
}
