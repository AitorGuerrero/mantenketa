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
  opts: {
    date?: string
    // Nombre del grupo a elegir en el selector de ámbito; ausente ⇒ Personal
    group?: string
    // Etiqueta del miembro a elegir en "Asignar a" (feature 012); requiere group
    assignee?: string
    // Nombre del proyecto a elegir en "Proyecto" (feature 013); del ámbito elegido
    project?: string
    description?: string
    // Urgencia (feature 015): urgent ⇒ activa el interruptor con margen 0; o
    // bien fija un margen en días (días tras la fecha o, sin fecha, la creación)
    urgent?: boolean
    urgencyMargin?: number
    // Recurrencia (feature 009); ausente ⇒ tarea única
    recurrence?: {
      interval: number
      freq: 'daily' | 'weekly' | 'monthly' | 'yearly'
      anchor: 'completion' | 'dueDate'
    }
  } = {},
): Promise<void> {
  await page.getByRole('button', { name: 'Nueva tarea' }).click()
  await page.getByLabel('Nombre', { exact: true }).fill(name)
  if (opts.date !== undefined) {
    await page.getByLabel('Fecha (opcional)').fill(opts.date)
  }
  if (opts.description !== undefined) {
    await page.getByLabel('Descripción (opcional)').fill(opts.description)
  }
  if (opts.urgent === true || opts.urgencyMargin !== undefined) {
    await page.getByRole('checkbox', { name: 'Urgente', exact: true }).check()
    if (opts.urgencyMargin !== undefined) {
      await page
        .getByLabel('Se vuelve urgente al cabo de')
        .fill(String(opts.urgencyMargin))
    }
  }
  if (opts.group !== undefined) {
    await page.getByLabel('Ámbito', { exact: true }).selectOption({ label: opts.group })
  }
  if (opts.assignee !== undefined) {
    // El selector "Asignar a" solo aparece tras elegir un grupo (feature 012)
    await page.getByLabel('Asignar a').selectOption({ label: opts.assignee })
  }
  if (opts.project !== undefined) {
    // El selector "Proyecto" aparece si hay proyectos en el ámbito (feature 013)
    await page.getByLabel('Proyecto', { exact: true }).selectOption({ label: opts.project })
  }
  if (opts.recurrence !== undefined) {
    await page.getByRole('checkbox', { name: 'Repetir', exact: true }).check()
    // exact: el panel de aviso diario tiene "Avísame cada día", que casaría con "Cada"
    await page.getByLabel('Cada', { exact: true }).fill(String(opts.recurrence.interval))
    await page.getByLabel('Frecuencia').selectOption(opts.recurrence.freq)
    await page.getByLabel('Contar').selectOption(opts.recurrence.anchor)
  }
  await page.getByRole('button', { name: 'Añadir tarea' }).click()
  // Al guardar con éxito el formulario se cierra y reaparece el botón
  await expect(page.getByRole('button', { name: 'Nueva tarea' })).toBeVisible()
}

/** Fila (listitem) que contiene `name`, en toda la página o dentro de una lista. */
export function taskRow(scope: Page | Locator, name: string): Locator {
  return scope.getByRole('listitem').filter({ hasText: name })
}

/** Expande una fila de la lista (acordeón, feature 017) para ver descripción,
 *  acciones y comentarios. Un toque sin arrastre la abre. */
export async function expandTask(page: Page, name: string): Promise<void> {
  const row = taskRow(page, name).first()
  await row.click()
  // Espera a que el contenido expandido (compositor de comentarios) monte, para
  // que el layout esté asentado antes de pulsar acciones reveladas.
  await row.getByLabel('Nuevo comentario').waitFor({ state: 'visible' })
}

/** Arrastra una fila horizontalmente para disparar su acción de deslizamiento
 *  (derecha = hecha, izquierda = devolver a pendiente). Sustituye al antiguo
 *  checkbox; funciona con ratón y con táctil. */
export async function swipeRow(
  page: Page,
  row: Locator,
  dir: 'right' | 'left' = 'right',
): Promise<void> {
  const box = await row.boundingBox()
  if (!box) throw new Error('sin fila para deslizar')
  const x = box.x + box.width / 2
  // Cerca del borde superior (sobre el nombre): una fila expandida (feature 017)
  // tiene comentarios debajo; deslizar arriba evita caer sobre el compositor.
  const y = box.y + Math.min(16, box.height / 2)
  const delta = dir === 'right' ? 240 : -240
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + delta, y, { steps: 8 })
  await page.mouse.up()
}

/** Completa la tarea pendiente `name` deslizando su fila a la derecha. */
export async function completeTask(page: Page, name: string): Promise<void> {
  await swipeRow(page, taskRow(page, name).first(), 'right')
}

/** Devuelve a pendiente la tarea hecha `name` deslizando su fila a la izquierda. */
export async function revertTask(page: Page, name: string): Promise<void> {
  await swipeRow(page, taskRow(page, name).first(), 'left')
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
