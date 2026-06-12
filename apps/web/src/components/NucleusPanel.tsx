// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'

import { observeSession } from '../auth/authService'
import {
  createInvitation,
  createNucleus,
  leaveNucleus,
  observeNucleus,
  OfflineError,
  revokeInvitation,
  type PendingInvitation,
} from '../data/nucleusService'
import { supabaseEnabled } from '../data/supabaseClient'

function errorMessage(cause: unknown): string {
  if (cause instanceof OfflineError) {
    return 'Estás sin conexión: las acciones del núcleo necesitan red'
  }
  return 'No se pudo completar la acción; inténtalo de nuevo'
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  })
}

export function NucleusPanel() {
  const session = useObservable(() => observeSession(), [])
  const nucleus = useObservable(() => observeNucleus(), [])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [lastInvitation, setLastInvitation] = useState<PendingInvitation | null>(null)
  const [copied, setCopied] = useState(false)

  if (!supabaseEnabled || !session) return null

  async function handleCreate() {
    setError(null)
    if (name.trim() === '') {
      setError('El núcleo necesita un nombre')
      return
    }
    try {
      await createNucleus(name.trim())
      setName('')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleInvite() {
    setError(null)
    setCopied(false)
    try {
      setLastInvitation(await createInvitation())
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleRevoke(token: string) {
    setError(null)
    try {
      await revokeInvitation(token)
      if (lastInvitation?.token === token) setLastInvitation(null)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleLeave() {
    if (!nucleus) return
    setError(null)
    const lastMember = nucleus.members.length === 1
    const warning = lastMember
      ? `Eres el último miembro: «${nucleus.name}» se disolverá y sus tareas compartidas se borrarán. ¿Abandonar el núcleo?`
      : `Dejarás de ver las tareas de «${nucleus.name}». Tus tareas personales no se ven afectadas. ¿Abandonar el núcleo?`
    if (!window.confirm(warning)) return
    try {
      await leaveNucleus()
      setLastInvitation(null)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <section className="nucleus-panel" aria-label="Núcleo familiar">
      <h2>Núcleo familiar</h2>

      {nucleus === null && (
        <div className="nucleus-create">
          <p className="nucleus-hint">
            Crea un núcleo para compartir tareas con tu familia.
          </p>
          <div className="form-field">
            <label htmlFor="nucleus-name">Nombre del núcleo</label>
            <input
              id="nucleus-name"
              type="text"
              value={name}
              placeholder="Casa Guerrero"
              onChange={(event) => {
                setName(event.target.value)
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              void handleCreate()
            }}
          >
            Crear núcleo
          </button>
        </div>
      )}

      {nucleus != null && (
        <div className="nucleus-info">
          <h3 className="nucleus-name">{nucleus.name}</h3>

          <ul className="nucleus-members" aria-label="Miembros del núcleo">
            {nucleus.members.map((member) => (
              <li key={member.userId}>
                {member.displayName}
                <span className="member-since"> · desde el {formatDay(member.since)}</span>
              </li>
            ))}
          </ul>

          <div className="nucleus-actions">
            <button
              type="button"
              onClick={() => {
                void handleInvite()
              }}
            >
              Generar invitación
            </button>
            <button
              type="button"
              className="button-danger"
              onClick={() => {
                void handleLeave()
              }}
            >
              Abandonar el núcleo
            </button>
          </div>

          {lastInvitation && (
            <div className="invitation-share">
              <label htmlFor="invitation-url">Enlace de invitación</label>
              <div className="invitation-row">
                <input id="invitation-url" type="text" readOnly value={lastInvitation.url} />
                <button
                  type="button"
                  onClick={() => {
                    void handleCopy(lastInvitation.url)
                  }}
                >
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>
              <p className="nucleus-hint">
                Caduca el {formatDay(lastInvitation.expiresAt)} y solo puede usarse una vez.
              </p>
            </div>
          )}

          {nucleus.pendingInvitations.length > 0 && (
            <div className="pending-invitations">
              <h4>Invitaciones pendientes</h4>
              <ul aria-label="Invitaciones pendientes">
                {nucleus.pendingInvitations.map((inv) => (
                  <li key={inv.token}>
                    <span>
                      De {inv.createdBy} · caduca el {formatDay(inv.expiresAt)}
                    </span>
                    <button
                      type="button"
                      className="button-danger"
                      onClick={() => {
                        void handleRevoke(inv.token)
                      }}
                    >
                      Revocar
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
