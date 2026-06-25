// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react'

import { swipeOutcome } from '../domain/deck'

// px para confirmar "hecha": el mismo umbral que la baraja (feature 004)
const SWIPE_THRESHOLD = 80
// px de margen antes de decidir si el gesto es deslizamiento (horizontal) o
// scroll (vertical); evita capturar el desplazamiento de la lista
const DRAG_SLOP = 8

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export interface SwipeComplete {
  /** Desplazamiento horizontal actual de la fila (px). */
  dx: number
  /** El usuario está arrastrando la fila ahora mismo. */
  dragging: boolean
  /** La fila vuela hacia fuera tras cruzar el umbral; al terminar se completa. */
  flying: boolean
  handlers: {
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void
    onTransitionEnd: (e: ReactTransitionEvent<HTMLElement>) => void
  }
}

/**
 * Lleva el gesto de la baraja («deslizar a la derecha = hecha») a una fila de
 * lista. Reutiliza la decisión pura `swipeOutcome`: solo el resultado `done`
 * (derecha más allá del umbral) actúa; izquierda o arrastre corto vuelven a su
 * sitio. Distingue scroll vertical de deslizamiento horizontal para no
 * secuestrar el desplazamiento de la lista. Cuando `enabled` es falso (puntero
 * fino o fila no pendiente) los gestos no hacen nada.
 */
export function useSwipeComplete(onComplete: () => void, enabled: boolean): SwipeComplete {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [flying, setFlying] = useState(false)
  // Origen del gesto; `decided` marca que ya se determinó que es horizontal
  const start = useRef<{ x: number; y: number; decided: boolean } | null>(null)

  function fly() {
    if (flying) return
    if (prefersReducedMotion()) {
      onComplete()
      return
    }
    setDragging(false)
    setFlying(true)
    // Vuela desde la posición actual hasta fuera de pantalla (la transición
    // interpola desde el dx actual).
    setDx(window.innerWidth)
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (!enabled || flying) return
    // No iniciar arrastre al tocar un control: checkbox, "Editar", enlaces de
    // recurrencia. Así el deslizamiento no compite con pulsarlos.
    if ((e.target as HTMLElement).closest('button, input, a, label, textarea, select')) {
      return
    }
    start.current = { x: e.clientX, y: e.clientY, decided: false }
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLElement>) {
    const s = start.current
    if (s === null) return
    if (!s.decided) {
      const adx = Math.abs(e.clientX - s.x)
      const ady = Math.abs(e.clientY - s.y)
      if (adx < DRAG_SLOP && ady < DRAG_SLOP) return
      if (ady > adx) {
        // Predominantemente vertical ⇒ es scroll; abandona el gesto.
        start.current = null
        return
      }
      s.decided = true
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    setDx(e.clientX - s.x)
  }

  function handlePointerUp() {
    const s = start.current
    start.current = null
    setDragging(false)
    if (!s?.decided) return
    // Solo la derecha confirma; izquierda ('defer') o corto ('cancel') vuelven.
    if (swipeOutcome(dx, SWIPE_THRESHOLD) === 'done') fly()
    else setDx(0)
  }

  function handleTransitionEnd(e: ReactTransitionEvent<HTMLElement>) {
    // La salida transiciona transform y opacity a la vez: actúa una sola vez.
    if (e.propertyName !== 'transform') return
    if (flying) onComplete()
  }

  return {
    dx: enabled ? dx : 0,
    dragging: enabled && dragging,
    flying: enabled && flying,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerUp,
      onTransitionEnd: handleTransitionEnd,
    },
  }
}
