'use client'

import type { AbaDetalhesPedido } from '../types'

interface PedidoDetalhesTabsProps {
  abaSelecionada: AbaDetalhesPedido
  onAbaChange: (aba: AbaDetalhesPedido) => void
  podeExibirAbaNotaFiscal: boolean
  podeExibirAbaDadosEntrega: boolean
}

const ABAS_DETALHES: Array<{ id: AbaDetalhesPedido; label: string; tabId: string }> = [
  { id: 'infoPedido', label: 'Info Pedidos', tabId: 'tab-detalhes-info-pedido' },
  { id: 'dadosEntrega', label: 'Dados da Entrega', tabId: 'tab-detalhes-dados-entrega' },
  { id: 'listaProdutos', label: 'Lista Produtos', tabId: 'tab-detalhes-lista-produtos' },
  { id: 'pagamentos', label: 'Pagamentos', tabId: 'tab-detalhes-pagamentos' },
  { id: 'notaFiscal', label: 'Nota Fiscal', tabId: 'tab-detalhes-nota-fiscal' },
]

export function PedidoDetalhesTabs({
  abaSelecionada,
  onAbaChange,
  podeExibirAbaNotaFiscal,
  podeExibirAbaDadosEntrega,
}: PedidoDetalhesTabsProps) {
  return (
    <div
      className="mt-3 flex gap-1 border-b border-gray-200"
      role="tablist"
      aria-label="Seções dos detalhes do pedido"
    >
      {ABAS_DETALHES.filter(aba => {
        if (aba.id === 'notaFiscal') return podeExibirAbaNotaFiscal
        if (aba.id === 'dadosEntrega') return podeExibirAbaDadosEntrega
        return true
      }).map(aba => (
        <button
          key={aba.id}
          type="button"
          role="tab"
          aria-selected={abaSelecionada === aba.id}
          id={aba.tabId}
          onClick={() => onAbaChange(aba.id)}
          className={`font-nunito -mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
            abaSelecionada === aba.id
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          {aba.label}
        </button>
      ))}
    </div>
  )
}
