import {
  observacoesArrayFromTexto,
  textoFromObservacoesApi,
} from '@/src/shared/helpers/observacaoPedido'
import type { Venda } from '@/src/presentation/components/features/kanban/types'

export type ObservacaoPedidoKanbanEndpoint = 'delivery' | 'gestor' | 'pdv'

/** Pedidos delivery (gestor entrega/retirada ou integradores) usam PATCH /delivery/pedidos/{id}. */
export function pedidoKanbanUsaEndpointDelivery(venda: Venda): boolean {
  if (venda.isDelivery()) return true
  return venda.isPedidoEntregaGestor()
}

export function resolverEndpointObservacaoPedidoKanban(venda: Venda): {
  tipo: ObservacaoPedidoKanbanEndpoint
  getUrl: string
  patchUrl: string
} {
  if (pedidoKanbanUsaEndpointDelivery(venda)) {
    const base = `/api/delivery/pedidos/${encodeURIComponent(venda.id)}`
    return { tipo: 'delivery', getUrl: base, patchUrl: base }
  }

  if (venda.tabelaOrigem === 'venda_gestor') {
    const base = `/api/vendas/gestor/${encodeURIComponent(venda.id)}`
    return {
      tipo: 'gestor',
      getUrl: `${base}?incluirFiscal=false`,
      patchUrl: base,
    }
  }

  const base = `/api/vendas/${encodeURIComponent(venda.id)}`
  return { tipo: 'pdv', getUrl: base, patchUrl: base }
}

export function observacoesPayloadPatchObservacaoPedido(texto: string): { observacoes: string[] } {
  const array = observacoesArrayFromTexto(texto)
  return { observacoes: array ?? [] }
}

export function extrairObservacaoPedidoDeRespostaApi(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const registro = data as Record<string, unknown>
  return textoFromObservacoesApi(registro.observacoes)
}
