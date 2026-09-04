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
  /** Cartão da Operação: rótulo curto e botão com mais relevo. */
  destaque?: boolean
}

function rotuloCurtoOperacao(
  colunaAtual: ColunaKanbanId,
  tipoVenda?: string | null
): { label: string; loading: string } {
  const retirada = String(tipoVenda ?? '').trim().toLowerCase() === 'retirada'
  if (colunaAtual === 'NOVOS_PEDIDOS') return { label: 'Preparo', loading: '…' }
  if (colunaAtual === 'EM_PREPARO') return { label: 'Pronto', loading: '…' }
  if (colunaAtual === 'PRONTO_ENTREGA') {
    return retirada ? { label: 'Retirada', loading: '…' } : { label: 'Saiu', loading: '…' }
  }
  if (colunaAtual === 'EM_ROTA') {
    return retirada ? { label: 'Retirou', loading: '…' } : { label: 'Entregue', loading: '…' }
  }
  return { label: 'Avançar', loading: '…' }
}

export function KanbanAvancarEtapaCompacto({
  venda,
  colunaAtual,
  avancando,
  onAvancar,
  className = '',
  destaque = false,
}: KanbanAvancarEtapaCompactoProps) {
  if (!pedidoPermiteAvancarEtapaKanban(venda, colunaAtual)) return null

  const rotulo = destaque
    ? rotuloCurtoOperacao(colunaAtual, venda.tipoVenda)
    : rotuloBotaoAvancarEtapaKanban(colunaAtual, venda.tipoVenda)
  const rotuloCompleto = rotuloBotaoAvancarEtapaKanban(colunaAtual, venda.tipoVenda)

  return (
    <button
      type="button"
      disabled={avancando}
      title={rotuloCompleto.label}
      onClick={e => {
        e.stopPropagation()
        onAvancar(venda, colunaAtual)
      }}
      className={
        destaque
          ? `flex h-8 w-full items-center justify-center rounded-lg bg-[#530CA3] text-xs font-bold text-white shadow-[0_2px_0_0_#3c0875] transition hover:bg-[#3f0980] hover:shadow-[0_3px_0_0_#2d0658] active:translate-y-px active:shadow-none disabled:cursor-wait disabled:opacity-70 ${className}`
          : `rounded-md bg-[#530CA3] px-2 py-1 text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70 ${className}`
      }
    >
      {avancando ? rotulo.loading : rotulo.label}
    </button>
  )
}
