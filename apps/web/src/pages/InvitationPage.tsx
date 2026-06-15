// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'

import { observeSession, signInWithGoogle } from '../auth/authService'
import {
  acceptInvitation,
  NucleusActionError,
  OfflineError,
} from '../data/nucleusService'

const ERROR_MESSAGES: Record<string, string> = {
  not_found: 'Esta invitación no existe.',
  expired: 'La invitación ha caducado. Pide que te generen una nueva.',
  revoked: 'La invitación fue revocada.',
  already_used: 'Esta invitación ya fue utilizada: solo vale una vez.',
  already_member: 'Ya eres miembro de este grupo.',
}

export function InvitationPage({ token }: { token: string }) {
  const session = useObservable(() => observeSession(), [])
  const [error, setError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)

  async function handleAccept() {
    setError(null)
    try {
      await acceptInvitation(token)
      setAccepted(true)
    } catch (cause) {
      if (cause instanceof OfflineError) {
        setError('Necesitas conexión para aceptar una invitación.')
      } else if (cause instanceof NucleusActionError) {
        setError(ERROR_MESSAGES[cause.code] ?? 'No se pudo aceptar la invitación.')
      } else {
        setError('No se pudo aceptar la invitación.')
      }
    }
  }

  return (
    <section className="invitation-page">
      <h2>Invitación a un grupo</h2>

      {accepted ? (
        <>
          <p>¡Ya formas parte del grupo! A partir de ahora verás sus tareas compartidas.</p>
          <a href="/">Ir a mis tareas</a>
        </>
      ) : session === null ? (
        <>
          <p>Para aceptar la invitación, primero inicia sesión.</p>
          <button
            type="button"
            className="auth-button"
            onClick={() => {
              void signInWithGoogle(window.location.href)
            }}
          >
            Iniciar sesión con Google
          </button>
        </>
      ) : (
        <>
          <p>Te han invitado a unirte a un grupo para compartir tareas.</p>
          <button
            type="button"
            onClick={() => {
              void handleAccept()
            }}
          >
            Aceptar la invitación
          </button>
        </>
      )}

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
