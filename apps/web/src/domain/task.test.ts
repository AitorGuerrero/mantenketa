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

    expect(parsed).toEqual({ name: 'Cambiar filtro', taskDate: null, nucleusId: null, assigneeId: null, description: null, urgent: false, recurrence: null })
  })

  it('normaliza una fecha vacía a null (FR-003)', () => {
    const parsed = parseNewTask({ name: 'Cambiar filtro', taskDate: '' })

    expect(parsed).toEqual({ name: 'Cambiar filtro', taskDate: null, nucleusId: null, assigneeId: null, description: null, urgent: false, recurrence: null })
  })

  it('rechaza una fecha con formato no válido', () => {
    expect(() =>
      parseNewTask({ name: 'Cambiar filtro', taskDate: 'mañana' }),
    ).toThrow('La fecha no es válida')
  })

  it('acepta una entrada válida y recorta el nombre', () => {
    const parsed = parseNewTask({ name: '  Cambiar filtro  ', taskDate: '2026-06-15' })

    expect(parsed).toEqual({ name: 'Cambiar filtro', taskDate: '2026-06-15', nucleusId: null, assigneeId: null, description: null, urgent: false, recurrence: null })
  })

  it('sin descripción (ausente) → null', () => {
    expect(parseNewTask({ name: 'Tarea' }).description).toBeNull()
  })

  it('descripción de solo espacios → null (FR-005)', () => {
    expect(parseNewTask({ name: 'Tarea', description: '   \n  ' }).description).toBeNull()
  })

  it('recorta los espacios alrededor pero conserva los saltos internos (FR-006)', () => {
    const parsed = parseNewTask({
      name: 'Tarea',
      description: '  Filtro HEPA\nel del armario  ',
    })

    expect(parsed.description).toBe('Filtro HEPA\nel del armario')
  })

  it('sin marcar urgente → false (FR-001)', () => {
    expect(parseNewTask({ name: 'Tarea' }).urgent).toBe(false)
  })

  it('marcado urgente → true', () => {
    expect(parseNewTask({ name: 'Tarea', urgent: true }).urgent).toBe(true)
  })

  it('sin grupo (ausente) → nucleusId null: la tarea es personal (FR-008)', () => {
    expect(parseNewTask({ name: 'Tarea' }).nucleusId).toBeNull()
  })

  it('con grupo elegido → conserva ese nucleusId (FR-008)', () => {
    const groupId = '11111111-1111-1111-1111-111111111111'
    expect(parseNewTask({ name: 'Tarea', nucleusId: groupId }).nucleusId).toBe(groupId)
  })
})
