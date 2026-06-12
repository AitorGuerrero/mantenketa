// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

/** Lo mínimo que la UI conoce de una invitación para derivar su estado. */
export interface InvitationSnapshot {
  status: 'pending' | 'accepted' | 'revoked'
  expiresAt: string // ISO
}

export type InvitationState = 'pending' | 'accepted' | 'revoked' | 'expired'

/**
 * Estado efectivo de una invitación (FR-010). La expiración se deriva del
 * tiempo (no hay cron que mute filas): pendiente + fecha vencida ⇒ caducada.
 * Los estados terminales (aceptada/revocada) prevalecen sobre la expiración.
 */
export function invitationState(
  invitation: InvitationSnapshot,
  nowIso: string,
): InvitationState {
  if (invitation.status !== 'pending') return invitation.status
  return invitation.expiresAt < nowIso ? 'expired' : 'pending'
}
