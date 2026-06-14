// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Aitor Guerrero

import { useObservable } from 'dexie-react-hooks'
import { useState } from 'react'

import { observeNucleus } from '../data/nucleusService'
import { taskRepository } from '../data/taskRepository'
import { todayIsoDate } from '../domain/date'
import { groupTasks, type TaskInGroup } from '../domain/grouping'

import { TaskDeck } from './TaskDeck'
import { TaskItem } from './TaskItem'
import { useCoarsePointer } from './useCoarsePointer'

interface GroupSectionProps {
  title: string
  items: TaskInGroup[]
  emptyHint: string
  memberName: (userId: string) => string
  label: string
}

function GroupSection({ title, items, emptyHint, memberName, label }: GroupSectionProps) {
  return (
    <section className="task-group">
      <h2 className="task-group-title">{title}</h2>
      {items.length === 0 ? (
        <p className="empty-state">{emptyHint}</p>
      ) : (
        <ul className="task-list" aria-label={label}>
          {items.map(({ task, isOverdue }) => (
            <TaskItem
              key={task.id}
              task={task}
              memberName={memberName}
              overdue={isOverdue}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

export function TaskGroups() {
  const tasks = useObservable(() => taskRepository.observeTasks(), [])
  const nucleus = useObservable(() => observeNucleus(), [])
  const touch = useCoarsePointer()
  // El usuario puede forzar la vista de lista en táctil (como en escritorio)
  const [forceList, setForceList] = useState(false)

  if (tasks === undefined) {
    return null
  }

  const { ya, pronto, hechas } = groupTasks(tasks, todayIsoDate())

  const memberName = (userId: string): string =>
    nucleus?.members.find((m) => m.userId === userId)?.displayName ?? 'otro miembro'

  return (
    <div className="task-groups">
      {touch && !forceList ? (
        <TaskDeck
          ya={ya}
          memberName={memberName}
          onViewAsList={() => {
            setForceList(true)
          }}
        />
      ) : (
        <>
          <GroupSection
            title="Para hacer ya"
            items={ya}
            emptyHint="Nada urgente ahora mismo"
            memberName={memberName}
            label="Tareas para hacer ya"
          />
          {/* En táctil, ofrecer volver a la baraja (en escritorio no hay tarjetas) */}
          {touch && forceList && (
            <button
              type="button"
              className="view-as-list"
              onClick={() => {
                setForceList(false)
              }}
            >
              Ver como tarjetas
            </button>
          )}
        </>
      )}
      <GroupSection
        title="Para hacer pronto"
        items={pronto}
        emptyHint="No hay tareas programadas"
        memberName={memberName}
        label="Tareas para hacer pronto"
      />
      <GroupSection
        title="Hechas recientemente"
        items={hechas}
        emptyHint="Todavía no has completado tareas"
        memberName={memberName}
        label="Tareas hechas recientemente"
      />
    </div>
  )
}
