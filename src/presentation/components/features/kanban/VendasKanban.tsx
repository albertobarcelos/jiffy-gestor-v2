'use client'

import { KanbanToolbar } from './components/KanbanToolbar'
import { KanbanBoardRenderer } from './components/KanbanBoardRenderer'
import { KanbanModaisRenderer } from './components/KanbanModaisRenderer'
import { useKanbanOrchestrator } from './hooks/useKanbanOrchestrator'

/**
 * Ponto de entrada do quadro Kanban (balcão + delivery).
 * Composição pura: lógica no useKanbanOrchestrator, UI nos renderers.
 */
export function VendasKanban() {
  const { toolbarProps, boardProps, modaisProps } = useKanbanOrchestrator()

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <KanbanToolbar {...toolbarProps} />
      <KanbanBoardRenderer {...boardProps} />
      <KanbanModaisRenderer {...modaisProps} />
    </div>
  )
}
