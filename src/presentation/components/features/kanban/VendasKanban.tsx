'use client'

import { KanbanToolbar } from './components/KanbanToolbar'
import { KanbanModaisRenderer } from './components/KanbanModaisRenderer'
import { KanbanVisualizacaoRenderer } from './components/KanbanVisualizacaoRenderer'
import { useKanbanOrchestrator } from './hooks/useKanbanOrchestrator'

/**
 * Ponto de entrada do quadro Kanban (balcão + delivery).
 * Composição pura: lógica no useKanbanOrchestrator, UI nos renderers.
 */
export function VendasKanban() {
  const { toolbarProps, boardProps, modaisProps, modoVisualizacao } = useKanbanOrchestrator()

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50">
      <KanbanToolbar {...toolbarProps} />
      <KanbanVisualizacaoRenderer modoVisualizacao={modoVisualizacao} {...boardProps} />
      <KanbanModaisRenderer {...modaisProps} />
    </div>
  )
}
