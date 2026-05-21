'use client'

import type { ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'

/** Área droppable da coluna: slots visuais ao arrastar (entrega operacional + fiscal). */
export function DroppableColumnContent({
  columnId,
  children,
  className,
  onScroll,
}: {
  columnId: string
  children: ReactNode
  className?: string
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId })
  const showDropSlotPendente = columnId === 'PENDENTE_EMISSAO' && isOver
  const showDropSlotFinalizadas = columnId === 'FINALIZADAS' && isOver
  const showDropSlotComNfe = columnId === 'COM_NFE' && isOver
  const showDropSlotNovos = columnId === 'NOVOS_PEDIDOS' && isOver
  const showDropSlotPreparo = columnId === 'EM_PREPARO' && isOver
  const showDropSlotPronto = columnId === 'PRONTO_ENTREGA' && isOver
  const showDropSlotRota = columnId === 'EM_ROTA' && isOver
  const isOverClass = showDropSlotPendente
    ? 'ring-2 ring-yellow-400 ring-inset bg-yellow-50/50'
    : showDropSlotFinalizadas
      ? 'ring-2 ring-blue-400 ring-inset bg-blue-50/50'
      : showDropSlotComNfe
        ? 'ring-2 ring-green-400 ring-inset bg-green-50/50'
        : showDropSlotNovos
          ? 'ring-2 ring-sky-400 ring-inset bg-sky-50/50'
          : showDropSlotPreparo
            ? 'ring-2 ring-amber-400 ring-inset bg-amber-50/50'
            : showDropSlotPronto
              ? 'ring-2 ring-teal-400 ring-inset bg-teal-50/50'
              : showDropSlotRota
                ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-50/50'
                : ''

  return (
    <div ref={setNodeRef} onScroll={onScroll} className={`${className ?? ''} ${isOverClass}`}>
      {showDropSlotPendente && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-yellow-400 bg-yellow-50/90 text-sm font-medium text-yellow-700 transition-all">
          Solte aqui para marcar para emissão
        </div>
      )}
      {showDropSlotFinalizadas && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-blue-400 bg-blue-50/90 text-sm font-medium text-blue-700 transition-all">
          Solte aqui para voltar à coluna Finalizadas
        </div>
      )}
      {showDropSlotComNfe && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-green-500 bg-green-50/90 px-2 text-center text-sm font-medium text-green-800 transition-all">
          Solte aqui para emitir ou reemitir nota
        </div>
      )}
      {showDropSlotNovos && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-sky-400 bg-sky-50/90 px-2 text-center text-sm font-medium text-sky-800 transition-all">
          Solte aqui para mover para Novos pedidos
        </div>
      )}
      {showDropSlotPreparo && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-amber-400 bg-amber-50/90 px-2 text-center text-sm font-medium text-amber-900 transition-all">
          Solte aqui para mover para Em preparo
        </div>
      )}
      {showDropSlotPronto && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-teal-400 bg-teal-50/90 px-2 text-center text-sm font-medium text-teal-900 transition-all">
          Solte aqui para mover para Pronto para entrega
        </div>
      )}
      {showDropSlotRota && (
        <div className="mb-2 flex min-h-[72px] items-center justify-center rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50/90 px-2 text-center text-sm font-medium text-indigo-900 transition-all">
          Solte aqui para mover para Em rota
        </div>
      )}
      {children}
    </div>
  )
}
