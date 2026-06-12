// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { parseNewTask } from './task'

describe('parseNewTask — validación de creación', () => {
  it('rechaza un nombre vacío (FR-002)', () => {
    expect(() => parseNewTask({ name: '', taskDate: '2026-06-15' })).toThrow(
      'El nombre es obligatorio',
    )
  })

  it('rechaza un nombre de solo espacios (FR-002)', () => {
    expect(() => parseNewTask({ name: '   ', taskDate: '2026-06-15' })).toThrow(
      'El nombre es obligatorio',
    )
  })

  it('acepta la falta de fecha: la tarea es "para hacer ya" (FR-003)', () => {
    const parsed = parseNewTask({ name: 'Cambiar filtro' })

    expect(parsed).toEqual({ name: 'Cambiar filtro', taskDate: null, scope: 'personal' })
  })

  it('normaliza una fecha vacía a null (FR-003)', () => {
    const parsed = parseNewTask({ name: 'Cambiar filtro', taskDate: '' })

    expect(parsed).toEqual({ name: 'Cambiar filtro', taskDate: null, scope: 'personal' })
  })

  it('rechaza una fecha con formato no válido', () => {
    expect(() =>
      parseNewTask({ name: 'Cambiar filtro', taskDate: 'mañana' }),
    ).toThrow('La fecha no es válida')
  })

  it('acepta una entrada válida y recorta el nombre', () => {
    const parsed = parseNewTask({ name: '  Cambiar filtro  ', taskDate: '2026-06-15' })

    expect(parsed).toEqual({ name: 'Cambiar filtro', taskDate: '2026-06-15', scope: 'personal' })
  })
})
