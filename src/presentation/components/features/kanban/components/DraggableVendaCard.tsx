'use client'

import type { ReactNode } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'
import type { KanbanColumn } from '../types'
import { COLUNAS_KANBAN_DRAG_ENTREGA, COLUNAS_KANBAN_DRAG_FISCAL } from '../rules/vendasKanban.rules'

function podeArrastarVendaNaColuna(venda: VendaUnificadaDTO, column: KanbanColumn): boolean {
  return (
    (venda.tabelaOrigem === 'venda' || venda.tabelaOrigem === 'venda_gestor') &&
    (COLUNAS_KANBAN_DRAG_FISCAL.has(column.id) ||
      (COLUNAS_KANBAN_DRAG_ENTREGA.has(column.id) && venda.isPedidoEntregaGestor()))
  )
}

function DraggableVendaCardAtivo({
  venda,
  children,
  disabled,
}: {
  venda: VendaUnificadaDTO
  children: ReactNode
  disabled: boolean
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `venda-${venda.id}`,
    data: { venda },
    disabled,
  })

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      className={
        disabled
          ? undefined
          : `cursor-grab touch-none select-none active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`.trim()
      }
      style={disabled ? undefined : { touchAction: 'none' }}
    >
      {children}
    </div>
  )
}

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
  if (!podeArrastarVendaNaColuna(venda, column)) {
    return <>{children}</>
  }

  // O mesmo invólucro permanece quando o arraste é pausado (painel aberto).
  // Trocar para um fragmento recria o card e solta a âncora do popover, que cai no canto da tela.
  return (
    <DraggableVendaCardAtivo venda={venda} disabled={dragDisabled}>
      {children}
    </DraggableVendaCardAtivo>
  )
}
