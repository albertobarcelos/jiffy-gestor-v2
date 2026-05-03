'use client'

import type { ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { VendaUnificadaDTO } from '@/src/presentation/hooks/useVendasUnificadas'
import type { KanbanColumn } from './types'
import { COLUNAS_KANBAN_DRAG_ENTREGA, COLUNAS_KANBAN_DRAG_FISCAL } from './fiscalFlowKanban.rules'

/**
 * Card draggable: fiscal (Finalizadas / Pendente emissão) ou entrega gestor (4 colunas operacionais).
 * Coluna Com nota solicitada: cards não arrastam (não voltam às colunas anteriores via DnD).
 */
export function DraggableVendaCard({
  venda,
  column,
  children,
}: {
  venda: VendaUnificadaDTO
  column: KanbanColumn
  children: ReactNode
}) {
  const isDraggable =
    (venda.tabelaOrigem === 'venda' || venda.tabelaOrigem === 'venda_gestor') &&
    (COLUNAS_KANBAN_DRAG_FISCAL.has(column.id) ||
      (COLUNAS_KANBAN_DRAG_ENTREGA.has(column.id) && venda.isPedidoEntregaGestor()))
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `venda-${venda.id}`,
    data: { venda },
    disabled: !isDraggable,
  })

  if (!isDraggable) return <>{children}</>

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none select-none active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
      style={{ touchAction: 'none' }}
    >
      {children}
    </div>
  )
}
