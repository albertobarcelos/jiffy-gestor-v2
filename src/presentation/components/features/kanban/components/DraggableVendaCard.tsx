'use client'

import type { ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'
import type { KanbanColumn } from '../types'
import { COLUNAS_KANBAN_DRAG_ENTREGA, COLUNAS_KANBAN_DRAG_FISCAL } from '../rules/vendasKanban.rules'

/**
 * Card draggable: fiscal (Finalizadas / Pendente emissão) ou entrega gestor (4 colunas operacionais).
 * Coluna Com nota solicitada: cards não arrastam (não voltam às colunas anteriores via DnD).
 */
export function DraggableVendaCard({
  venda,
  column,
  children,
  dragDisabled = false,
}: {
  venda: VendaUnificadaDTO
  column: KanbanColumn
  children: ReactNode
  dragDisabled?: boolean
}) {
  const canDragInColumn =
    (venda.tabelaOrigem === 'venda' || venda.tabelaOrigem === 'venda_gestor') &&
    (COLUNAS_KANBAN_DRAG_FISCAL.has(column.id) ||
      (COLUNAS_KANBAN_DRAG_ENTREGA.has(column.id) && venda.isPedidoEntregaGestor()))
  const dragAtivo = canDragInColumn && !dragDisabled

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `venda-${venda.id}`,
    data: { venda },
    disabled: !dragAtivo,
  })

  if (!canDragInColumn) return <>{children}</>

  return (
    <div
      ref={setNodeRef}
      {...(dragAtivo ? listeners : {})}
      {...(dragAtivo ? attributes : {})}
      className={`${dragAtivo ? 'cursor-grab touch-none select-none active:cursor-grabbing' : ''} ${isDragging ? 'opacity-40' : ''}`.trim()}
      style={dragAtivo ? { touchAction: 'none' } : undefined}
    >
      {children}
    </div>
  )
}
