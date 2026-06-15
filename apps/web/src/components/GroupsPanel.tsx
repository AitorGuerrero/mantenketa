// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'

import { observeSession } from '../auth/authService'
import {
  createGroup,
  createInvitation,
  leaveGroup,
  observeGroups,
  OfflineError,
  revokeInvitation,
  type GroupView,
  type PendingInvitation,
} from '../data/nucleusService'
import { supabaseEnabled } from '../data/supabaseClient'

function errorMessage(cause: unknown): string {
  if (cause instanceof OfflineError) {
    return 'Estás sin conexión: las acciones de grupo necesitan red'
  }
  return 'No se pudo completar la acción; inténtalo de nuevo'
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  })
}

/** Invitación recién generada, junto al grupo al que pertenece. */
interface ActiveInvitation {
  groupId: string
  invitation: PendingInvitation
}

export function GroupsPanel() {
  const session = useObservable(() => observeSession(), [])
  const groups = useObservable(() => observeGroups(), [])
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<ActiveInvitation | null>(null)
  const [copied, setCopied] = useState(false)

  if (!supabaseEnabled || !session) return null

  const myGroups = groups ?? []

  async function handleCreate() {
    setError(null)
    if (name.trim() === '') {
      setError('El grupo necesita un nombre')
      return
    }
    try {
      await createGroup(name.trim())
      setName('')
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleInvite(groupId: string) {
    setError(null)
    setCopied(false)
    try {
      setActive({ groupId, invitation: await createInvitation(groupId) })
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleRevoke(token: string) {
    setError(null)
    try {
      await revokeInvitation(token)
      if (active?.invitation.token === token) setActive(null)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleLeave(group: GroupView) {
    setError(null)
    const lastMember = group.members.length === 1
    const warning = lastMember
      ? `Eres el último miembro: «${group.name}» se disolverá y sus tareas compartidas se borrarán. ¿Abandonar el grupo?`
      : `Dejarás de ver las tareas de «${group.name}». Tus tareas personales y tus otros grupos no se ven afectados. ¿Abandonar el grupo?`
    if (!window.confirm(warning)) return
    try {
      await leaveGroup(group.id)
      if (active?.groupId === group.id) setActive(null)
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <section className="groups-panel" aria-label="Grupos">
      <h2>Grupos</h2>

      <div className="group-create">
        <p className="group-hint">
          Crea un grupo para compartir tareas (casa, viaje, trabajo…). Puedes
          pertenecer a varios a la vez.
        </p>
        <div className="form-field">
          <label htmlFor="group-name">Nombre del grupo</label>
          <input
            id="group-name"
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
          Crear grupo
        </button>
      </div>

      {myGroups.map((group) => (
        <article key={group.id} className="group-info" aria-label={group.name}>
          <h3 className="group-name">{group.name}</h3>

          <ul className="group-members" aria-label={`Miembros de ${group.name}`}>
            {group.members.map((member) => (
              <li key={member.userId}>
                {member.displayName}
                <span className="member-since"> · desde el {formatDay(member.since)}</span>
              </li>
            ))}
          </ul>

          <div className="group-actions">
            <button
              type="button"
              onClick={() => {
                void handleInvite(group.id)
              }}
            >
              Generar invitación
            </button>
            <button
              type="button"
              className="button-danger"
              onClick={() => {
                void handleLeave(group)
              }}
            >
              Abandonar el grupo
            </button>
          </div>

          {active?.groupId === group.id && (
            <div className="invitation-share">
              <label htmlFor={`invitation-url-${group.id}`}>Enlace de invitación</label>
              <div className="invitation-row">
                <input
                  id={`invitation-url-${group.id}`}
                  type="text"
                  readOnly
                  value={active.invitation.url}
                />
                <button
                  type="button"
                  onClick={() => {
                    void handleCopy(active.invitation.url)
                  }}
                >
                  {copied ? 'Copiado' : 'Copiar enlace'}
                </button>
              </div>
              <p className="group-hint">
                Caduca el {formatDay(active.invitation.expiresAt)} y solo puede usarse
                una vez.
              </p>
            </div>
          )}

          {group.pendingInvitations.length > 0 && (
            <div className="pending-invitations">
              <h4>Invitaciones pendientes</h4>
              <ul aria-label={`Invitaciones pendientes de ${group.name}`}>
                {group.pendingInvitations.map((inv) => (
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
        </article>
      ))}

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
