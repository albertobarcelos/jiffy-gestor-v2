'use client'

import { MdAdd, MdSettings } from 'react-icons/md'
import { LojaAbertaToggle } from '@/src/presentation/components/features/delivery/LojaAbertaToggle'
import { KANBAN_BUTTON_COLOR } from './kanbanToolbarTheme'

export function KanbanToolbarAcoesPrincipais({
  isModoDelivery,
  onAbrirConfiguracoesDelivery,
  onAbrirNovoPedido,
}: {
  isModoDelivery: boolean
  onAbrirConfiguracoesDelivery: () => void
  onAbrirNovoPedido: () => void
}) {
  return (
    <>
      {isModoDelivery ? <LojaAbertaToggle /> : null}
      <button
        type="button"
        onClick={onAbrirConfiguracoesDelivery}
        className="shrink-0 rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
        title={isModoDelivery ? 'Configurações do delivery' : 'Configurações do balcão'}
        aria-label={
          isModoDelivery
            ? 'Abrir configurações do delivery'
            : 'Abrir configurações do balcão'
        }
      >
        <MdSettings className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onAbrirNovoPedido}
        className="flex min-w-[9.5rem] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-5 py-1.5 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: KANBAN_BUTTON_COLOR }}
      >
        <MdAdd className="h-4 w-4" />
        Novo Pedido
      </button>
    </>
  )
}
