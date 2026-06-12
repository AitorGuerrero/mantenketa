// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'

import { observeSession, signInWithGoogle, signOut } from '../auth/authService'
import { supabaseEnabled } from '../data/supabaseClient'

export function AuthMenu() {
  const session = useObservable(() => observeSession(), [])

  if (!supabaseEnabled) return null

  async function handleSignOut() {
    const result = await signOut()
    if (result && result.pendingPushes > 0) {
      const proceed = window.confirm(
        `Tienes ${String(result.pendingPushes)} cambio(s) sin sincronizar que se ` +
          'perderán si cierras sesión ahora. ¿Cerrar sesión de todas formas?',
      )
      if (proceed) {
        await signOut({ force: true })
      }
    }
  }

  if (!session) {
    return (
      <div className="auth-menu">
        <button
          type="button"
          className="auth-button"
          onClick={() => {
            void signInWithGoogle()
          }}
        >
          Iniciar sesión con Google
        </button>
      </div>
    )
  }

  return (
    <div className="auth-menu">
      <span className="auth-user" title={session.email}>
        {session.displayName}
      </span>
      <button
        type="button"
        className="auth-button auth-button--secondary"
        onClick={() => {
          void handleSignOut()
        }}
      >
        Cerrar sesión
      </button>
    </div>
  )
}
