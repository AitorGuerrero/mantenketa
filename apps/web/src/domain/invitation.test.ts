// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { describe, expect, it } from 'vitest'

import { invitationState, type InvitationSnapshot } from './invitation'

const NOW = '2026-06-11T12:00:00.000Z'

function makeInvitation(overrides: Partial<InvitationSnapshot> = {}): InvitationSnapshot {
  return {
    status: 'pending',
    expiresAt: '2026-06-18T12:00:00.000Z',
    ...overrides,
  }
}

describe('invitationState (FR-010)', () => {
  it('una invitación vigente está pendiente', () => {
    expect(invitationState(makeInvitation(), NOW)).toBe('pending')
  })

  it('una invitación pendiente pasada su expiración está caducada', () => {
    const expired = makeInvitation({ expiresAt: '2026-06-10T12:00:00.000Z' })

    expect(invitationState(expired, NOW)).toBe('expired')
  })

  it('una invitación aceptada se informa como usada aunque haya expirado después', () => {
    const accepted = makeInvitation({
      status: 'accepted',
      expiresAt: '2026-06-10T12:00:00.000Z',
    })

    expect(invitationState(accepted, NOW)).toBe('accepted')
  })

  it('una invitación revocada se informa como revocada', () => {
    expect(invitationState(makeInvitation({ status: 'revoked' }), NOW)).toBe('revoked')
  })

  it('en el límite exacto de expiración sigue siendo válida', () => {
    const edge = makeInvitation({ expiresAt: NOW })

    expect(invitationState(edge, NOW)).toBe('pending')
  })
})
