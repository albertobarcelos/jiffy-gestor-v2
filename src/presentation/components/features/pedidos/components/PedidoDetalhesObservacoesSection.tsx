'use client'

import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import {
  produtosComObservacaoExibicao,
  textoObservacaoPedidoDetalhe,
} from '@/src/shared/helpers/observacaoPedido'

export interface PedidoDetalhesObservacoesSectionProps {
  observacaoPedido?: string | null
  observacaoPedidoEntrega?: string | null
  produtos?: ProdutoSelecionado[]
  className?: string
  variant?: 'default' | 'compact'
  /** Quando false, exibe só observação do pedido (ex.: aba lista, onde itens já têm Obs inline). */
  incluirObservacoesItens?: boolean
  /** Título "Observações" no topo da seção (default/compact). */
  exibirTituloSecao?: boolean
}

export function PedidoDetalhesObservacoesSection({
  observacaoPedido,
  observacaoPedidoEntrega,
  produtos = [],
  className = '',
  variant = 'default',
  incluirObservacoesItens = true,
  exibirTituloSecao = true,
}: PedidoDetalhesObservacoesSectionProps) {
  const textoPedido = textoObservacaoPedidoDetalhe(observacaoPedido, observacaoPedidoEntrega)
  const itensComObs = incluirObservacoesItens ? produtosComObservacaoExibicao(produtos) : []

  if (!textoPedido && itensComObs.length === 0) {
    return null
  }

  const tituloClass =
    variant === 'compact'
      ? 'text-[11px] font-semibold text-gray-700'
      : 'text-sm font-semibold text-gray-900'
  const labelClass = variant === 'compact' ? 'text-[11px] text-gray-600' : 'text-gray-600'
  const valueClass =
    variant === 'compact'
      ? 'text-[11px] leading-snug text-gray-600'
      : 'font-medium leading-snug text-gray-900'
  const itemNomeClass =
    variant === 'compact' ? 'text-[11px] font-medium text-gray-700' : 'font-medium text-gray-900'
  const itemObsClass =
    variant === 'compact' ? 'text-[11px] leading-snug text-gray-600' : 'leading-snug text-gray-700'

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      {variant === 'default' && exibirTituloSecao && (
        <h4 className={tituloClass}>Observações</h4>
      )}

      {textoPedido ? (
        <div className="flex flex-col gap-1 px-1">
          <span className={labelClass}>Observação do pedido:</span>
          <span className={valueClass}>{textoPedido}</span>
        </div>
      ) : null}

      {itensComObs.length > 0 ? (
        <div className="flex flex-col gap-2 px-1">
          <span className={labelClass}>Observações dos itens:</span>
          <ul className="space-y-1.5">
            {itensComObs.map((item, index) => (
              <li key={`${item.nome}-${index}`} className="leading-snug">
                <span className={itemNomeClass}>{item.nome}: </span>
                <span className={itemObsClass}>{item.observacao}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
