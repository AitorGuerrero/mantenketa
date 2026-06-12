// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

/** Sesión visible para el resto de la app — null en modo anónimo (FR-002). */
export interface UserSession {
  userId: string
  displayName: string
  email: string
}

type Listener = (session: UserSession | null) => void

let current: UserSession | null = null
const listeners = new Set<Listener>()

export function getCurrentSession(): UserSession | null {
  return current
}

export function getCurrentUserId(): string | null {
  return current?.userId ?? null
}

export function setCurrentSession(session: UserSession | null): void {
  current = session
  for (const listener of listeners) {
    listener(session)
  }
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
