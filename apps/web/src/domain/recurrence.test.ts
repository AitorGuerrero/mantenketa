// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { cadenceLabel, nextOccurrenceDate, successorId, type Recurrence } from './recurrence'

function rec(freq: Recurrence['freq'], interval = 1): Recurrence {
  return { freq, interval, anchor: 'completion' }
}

describe('nextOccurrenceDate — cálculo puro de la próxima fecha (FR-004/FR-005)', () => {
  it('diaria: suma días', () => {
    expect(nextOccurrenceDate('2026-06-15', rec('daily'))).toBe('2026-06-16')
    expect(nextOccurrenceDate('2026-06-15', rec('daily', 3))).toBe('2026-06-18')
  })

  it('semanal: suma 7·N días', () => {
    expect(nextOccurrenceDate('2026-06-15', rec('weekly'))).toBe('2026-06-22')
    expect(nextOccurrenceDate('2026-06-15', rec('weekly', 2))).toBe('2026-06-29')
  })

  it('mensual: suma meses naturales', () => {
    expect(nextOccurrenceDate('2026-01-15', rec('monthly'))).toBe('2026-02-15')
    expect(nextOccurrenceDate('2026-12-15', rec('monthly'))).toBe('2027-01-15')
  })

  it('mensual: recorta al último día cuando el mes destino es más corto (FR-005)', () => {
    expect(nextOccurrenceDate('2026-01-31', rec('monthly'))).toBe('2026-02-28')
    expect(nextOccurrenceDate('2028-01-31', rec('monthly'))).toBe('2028-02-29') // bisiesto
    expect(nextOccurrenceDate('2026-01-31', rec('monthly', 3))).toBe('2026-04-30')
  })

  it('anual: suma años, con recorte del 29-feb en años no bisiestos', () => {
    expect(nextOccurrenceDate('2026-06-15', rec('yearly'))).toBe('2027-06-15')
    expect(nextOccurrenceDate('2028-02-29', rec('yearly'))).toBe('2029-02-28')
  })
})

describe('cadenceLabel — texto de la cadencia (FR-011)', () => {
  it('intervalo 1: singular', () => {
    expect(cadenceLabel(rec('daily'))).toBe('cada día')
    expect(cadenceLabel(rec('weekly'))).toBe('cada semana')
    expect(cadenceLabel(rec('monthly'))).toBe('cada mes')
    expect(cadenceLabel(rec('yearly'))).toBe('cada año')
  })

  it('intervalo > 1: plural con número', () => {
    expect(cadenceLabel(rec('daily', 3))).toBe('cada 3 días')
    expect(cadenceLabel(rec('weekly', 2))).toBe('cada 2 semanas')
    expect(cadenceLabel(rec('monthly', 3))).toBe('cada 3 meses')
    expect(cadenceLabel(rec('yearly', 2))).toBe('cada 2 años')
  })
})

describe('successorId — identidad determinista del sucesor (FR-007/SC-003)', () => {
  const series = '11111111-1111-1111-1111-111111111111'
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  it('mismos datos → mismo uuid (dos dispositivos convergen)', () => {
    expect(successorId(series, '2026-07-01')).toBe(successorId(series, '2026-07-01'))
  })

  it('fecha distinta → uuid distinto', () => {
    expect(successorId(series, '2026-07-01')).not.toBe(successorId(series, '2026-08-01'))
  })

  it('serie distinta → uuid distinto', () => {
    const other = '22222222-2222-2222-2222-222222222222'
    expect(successorId(series, '2026-07-01')).not.toBe(successorId(other, '2026-07-01'))
  })

  it('devuelve un uuid con formato válido', () => {
    expect(successorId(series, '2026-07-01')).toMatch(UUID_RE)
  })
})
