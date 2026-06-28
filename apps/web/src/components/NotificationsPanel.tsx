// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'

import { DEFAULT_TIME } from '../notifications/keys'
import {
  dailySummarySupported,
  disableDailySummary,
  enableDailySummary,
  observeDailySummary,
  setDailySummaryTime,
} from '../notifications/dailySummaryClient'

// Aviso diario (feature 016): interruptor + hora. Local, sin cuenta. El único
// canal es la notificación de Android; no hay resumen dentro de la app.
export function NotificationsPanel() {
  const settings = useObservable(() => observeDailySummary(), [])
  // null mientras se comprueba; false ⇒ navegador/dispositivo no compatible
  const [supported, setSupported] = useState<boolean | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void dailySummarySupported().then((ok) => {
      if (active) setSupported(ok)
    })
    return () => {
      active = false
    }
  }, [])

  const enabled = settings?.enabled ?? false
  const time = settings?.time ?? DEFAULT_TIME

  async function handleToggle(next: boolean) {
    setMessage(null)
    if (!next) {
      await disableDailySummary()
      return
    }
    const result = await enableDailySummary()
    if (result === 'denied') {
      setMessage('Necesito permiso de notificaciones para avisarte.')
    } else if (result === 'unsupported') {
      setSupported(false)
    }
  }

  return (
    <section className="notifications-panel" aria-label="Aviso diario">
      <h2>Aviso diario</h2>

      {supported === false ? (
        <p className="group-hint">
          Tu navegador no puede enviar avisos en segundo plano. Disponible en
          Chrome/Edge de Android con la app instalada.
        </p>
      ) : (
        <>
          <label className="toggle-field">
            <input
              type="checkbox"
              checked={enabled}
              disabled={supported === null}
              onChange={(event) => {
                void handleToggle(event.target.checked)
              }}
            />
            <span>Avísame cada día</span>
          </label>

          {enabled && (
            <div className="form-field">
              <label htmlFor="daily-summary-time">A partir de las</label>
              <input
                id="daily-summary-time"
                type="time"
                value={time}
                onChange={(event) => {
                  void setDailySummaryTime(event.target.value)
                }}
              />
              <span className="form-suffix">
                aprox.: el aviso llega en el primer despertar a partir de esa hora
                (puede ser más tarde).
              </span>
            </div>
          )}

          <p className="group-hint">
            Un resumen al día con tus tareas nuevas, urgentes y pendientes, como
            notificación de Android. No necesitas cuenta.
          </p>
        </>
      )}

      {message !== null && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </section>
  )
}
