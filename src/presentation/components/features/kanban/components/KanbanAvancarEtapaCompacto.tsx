'use client'

import { COLUNAS_ENTREGA_OPERACIONAIS, rotuloBotaoAvancarEtapaKanban } from '../rules/vendasKanban.rules'
import type { ColunaKanbanId, Venda } from '../types'

export function pedidoPermiteAvancarEtapaKanban(
  venda: Venda,
  colunaAtual: ColunaKanbanId
): boolean {
  return venda.isPedidoEntregaGestor() && COLUNAS_ENTREGA_OPERACIONAIS.includes(colunaAtual)
}

export interface KanbanAvancarEtapaCompactoProps {
  venda: Venda
  colunaAtual: ColunaKanbanId
  avancando: boolean
  onAvancar: (venda: Venda, colunaAtual: ColunaKanbanId) => void
  className?: string
}

export function KanbanAvancarEtapaCompacto({
  venda,
  colunaAtual,
  avancando,
  onAvancar,
  className = '',
}: KanbanAvancarEtapaCompactoProps) {
  if (!pedidoPermiteAvancarEtapaKanban(venda, colunaAtual)) return null

  const rotulo = rotuloBotaoAvancarEtapaKanban(colunaAtual, venda.tipoVenda)

  return (
    <button
      type="button"
      disabled={avancando}
      onClick={e => {
        e.stopPropagation()
        onAvancar(venda, colunaAtual)
      }}
      className={`rounded-md bg-[#530CA3] px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 ${className}`}
    >
      {avancando ? rotulo.loading : rotulo.label}
    </button>
  )
}
