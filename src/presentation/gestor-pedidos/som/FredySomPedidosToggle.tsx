'use client'

import { MdVolumeOff, MdVolumeUp } from 'react-icons/md'
import { useFredySomPedidoNovo } from '@/src/presentation/gestor-pedidos/som/useFredySomPedidoNovo'

export function FredySomPedidosToggle({ disabled = false }: { disabled?: boolean }) {
  const { ativoNoFredy, silenciado, alternarSilenciado } = useFredySomPedidoNovo()
  if (!ativoNoFredy) return null

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={alternarSilenciado}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-primary-bg hover:text-gray-900 disabled:opacity-80"
      title={silenciado ? 'Ativar som de novos pedidos' : 'Silenciar novos pedidos'}
      aria-label={silenciado ? 'Ativar som de novos pedidos' : 'Silenciar novos pedidos'}
      aria-pressed={silenciado}
    >
      {silenciado ? <MdVolumeOff size={24} aria-hidden /> : <MdVolumeUp size={24} aria-hidden />}
    </button>
  )
}
