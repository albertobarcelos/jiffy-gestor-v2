'use client'

import { MdVolumeOff, MdVolumeUp } from 'react-icons/md'
import { useFredySomPedidoNovo } from '@/src/presentation/gestor-pedidos/som/useFredySomPedidoNovo'

export function FredySomPedidosToggle() {
  const { ativoNoFredy, silenciado, alternarSilenciado } = useFredySomPedidoNovo()
  if (!ativoNoFredy) return null

  return (
    <button
      type="button"
      onClick={alternarSilenciado}
      className="rounded-lg border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-primary"
      title={silenciado ? 'Ativar som de novos pedidos' : 'Silenciar novos pedidos'}
      aria-label={silenciado ? 'Ativar som de novos pedidos' : 'Silenciar novos pedidos'}
      aria-pressed={silenciado}
    >
      {silenciado ? <MdVolumeOff className="h-5 w-5" /> : <MdVolumeUp className="h-5 w-5" />}
    </button>
  )
}
