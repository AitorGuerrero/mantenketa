// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useSyncExternalStore } from 'react'

import { getCurrentUserId, subscribeSession } from '../auth/sessionStore'

/**
 * Id del usuario con sesión, de forma reactiva (null en modo anónimo). Se usa
 * para resaltar/filtrar "mis tareas" (feature 012).
 */
export function useCurrentUserId(): string | null {
  return useSyncExternalStore(subscribeSession, getCurrentUserId, () => null)
}
