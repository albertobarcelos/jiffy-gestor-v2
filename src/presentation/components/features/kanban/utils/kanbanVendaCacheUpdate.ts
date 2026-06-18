import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { KanbanVendaCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'
import { extrairPatchKanbanDeRespostaTransicao } from '@/src/application/mappers/TransicaoPedidoDeliveryMapper'
import {
  KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY,
  KANBAN_VENDAS_UNIFICADAS_QUERY_KEY,
} from '../hooks/kanbanListagemQueryCache'

export type { KanbanVendaCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'
export { extrairPatchKanbanDeRespostaTransicao }

import {
  VendaUnificadaDTO,
  type VendasUnificadasResponse,
} from '../hooks/useVendasUnificadas'

function isoDeCampoApi(valor: unknown): string | null {
  if (valor == null) return null
  const texto = String(valor).trim()
  return texto || null
}

/** Extrai campos operacionais da resposta de POST /vendas/gestor/:id/transicoes (legado). */
export function extrairPatchKanbanDeTransicaoGestor(data: unknown): KanbanVendaCachePatch {
  const registro =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {}

  const statusEtapaOperacional =
    isoDeCampoApi(registro.statusOperacional) ??
    isoDeCampoApi(registro.status_operacional) ??
    isoDeCampoApi(registro.statusEtapaOperacional) ??
    isoDeCampoApi(registro.status_etapa_operacional)

  return {
    statusEtapaOperacional,
    dataUltimaModificacao:
      isoDeCampoApi(registro.dataUltimaModificacao) ??
      isoDeCampoApi(registro.data_ultima_modificacao),
    dataFinalizacao:
      isoDeCampoApi(registro.dataFinalizacao) ?? isoDeCampoApi(registro.data_finalizacao),
  }
}

export function cloneVendaUnificadaDTO(
  venda: VendaUnificadaDTO,
  patch: KanbanVendaCachePatch
): VendaUnificadaDTO {
  return new VendaUnificadaDTO(
    venda.id,
    venda.numeroVenda,
    venda.codigoVenda,
    venda.tipoVenda,
    venda.origem,
    venda.tabelaOrigem,
    patch.valorFinal !== undefined ? patch.valorFinal : venda.valorFinal,
    venda.totalDesconto,
    venda.totalAcrescimo,
    venda.dataCriacao,
    patch.dataFinalizacao !== undefined ? patch.dataFinalizacao : venda.dataFinalizacao,
    venda.dataCancelamento,
    venda.cliente,
    patch.solicitarEmissaoFiscal !== undefined
      ? patch.solicitarEmissaoFiscal
      : venda.solicitarEmissaoFiscal,
    patch.statusFiscal !== undefined ? patch.statusFiscal : venda.statusFiscal,
    patch.documentoFiscalId !== undefined ? patch.documentoFiscalId : venda.documentoFiscalId,
    venda.abertoPor,
    venda.numeroMesa,
    patch.numeroFiscal !== undefined ? patch.numeroFiscal : venda.numeroFiscal,
    patch.serieFiscal !== undefined ? patch.serieFiscal : venda.serieFiscal,
    patch.dataEmissaoFiscal !== undefined ? patch.dataEmissaoFiscal : venda.dataEmissaoFiscal,
    patch.tipoDocFiscal !== undefined ? patch.tipoDocFiscal : venda.tipoDocFiscal,
    patch.modelo !== undefined ? patch.modelo : venda.modelo,
    patch.retornoSefaz !== undefined ? patch.retornoSefaz : venda.retornoSefaz,
    patch.statusEtapaOperacional !== undefined
      ? patch.statusEtapaOperacional
      : venda.statusEtapaOperacional,
    patch.dataUltimaModificacao !== undefined
      ? patch.dataUltimaModificacao
      : venda.dataUltimaModificacao,
    patch.statusFinanceiro !== undefined ? patch.statusFinanceiro : venda.statusFinanceiro,
    patch.observacoes !== undefined ? patch.observacoes : venda.observacoes,
    venda.previsaoEntregaEm,
    venda.tempoTotalEstimadoSegundos,
    venda.fluxoPagamentoEntrega,
    venda.cobrancasDelivery
  )
}

/** Atualiza o item em todas as listagens infinitas do Kanban (balcão + delivery). */
export function patchKanbanVendasListagemCache(
  queryClient: QueryClient,
  vendaId: string,
  patch: KanbanVendaCachePatch
): boolean {
  let encontrou = false

  const prefixos = [
    KANBAN_VENDAS_UNIFICADAS_QUERY_KEY,
    KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY,
  ] as const

  for (const prefix of prefixos) {
    const queries = queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>({
      queryKey: prefix,
    })
    for (const [queryKey] of queries) {
      const patched = patchVendaUnificadaInfiniteCache(queryClient, queryKey, vendaId, patch)
      if (patched) encontrou = true
    }
  }

  return encontrou
}

/** Atualiza um item no cache infinito do Kanban sem refetch da lista inteira. */
export function patchVendaUnificadaInfiniteCache(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaId: string,
  patch: KanbanVendaCachePatch
): boolean {
  let encontrou = false

  queryClient.setQueryData<InfiniteData<VendasUnificadasResponse>>(queryKey, atual => {
    if (!atual?.pages?.length) return atual

    const pages = atual.pages.map(page => ({
      ...page,
      items: page.items.map(item => {
        if (item.id !== vendaId) return item
        encontrou = true
        return cloneVendaUnificadaDTO(item, patch)
      }),
    }))

    return encontrou ? { ...atual, pages } : atual
  })

  return encontrou
}

/** Sincroniza pedido delivery gestor via GET leve (substitui refetch da lista inteira). */
export async function sincronizarPedidoDeliveryKanbanEmBackground(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaId: string,
  token: string
): Promise<void> {
  try {
    const response = await fetch(`/api/delivery/pedidos/${encodeURIComponent(vendaId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return

    const data = await response.json()
    patchVendaUnificadaInfiniteCache(
      queryClient,
      queryKey,
      vendaId,
      extrairPatchKanbanDeRespostaTransicao(data)
    )
  } catch {
    /* falha silenciosa — cache otimista + patch da transição já atualizaram a UI */
  }
}

const PREFIXOS_LISTAGEM_KANBAN = [
  KANBAN_VENDAS_UNIFICADAS_QUERY_KEY,
  KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY,
] as const

/**
 * A listagem GET /delivery/pedidos (summary) não inclui `observacoes`.
 * Ao refetch, preserva observações já presentes no cache do Kanban (patch local ou unificado).
 */
export function preservarObservacoesKanbanCacheNosItems(
  queryClient: QueryClient,
  novosItems: VendaUnificadaDTO[]
): VendaUnificadaDTO[] {
  const observacoesPorId = new Map<string, string[]>()

  for (const prefix of PREFIXOS_LISTAGEM_KANBAN) {
    const queries = queryClient.getQueriesData<InfiniteData<VendasUnificadasResponse>>({
      queryKey: prefix,
    })
    for (const [, data] of queries) {
      if (!data?.pages?.length) continue
      for (const page of data.pages) {
        for (const item of page.items) {
          if (item.observacoes?.length) {
            observacoesPorId.set(item.id, item.observacoes)
          }
        }
      }
    }
  }

  if (observacoesPorId.size === 0) return novosItems

  return novosItems.map(item => {
    if (item.observacoes?.length) return item
    const cached = observacoesPorId.get(item.id)
    if (!cached?.length) return item
    return cloneVendaUnificadaDTO(item, { observacoes: cached })
  })
}

/** Sincroniza uma venda gestor via GET leve (substitui refetch da lista inteira). */
export async function sincronizarVendaGestorKanbanEmBackground(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  vendaId: string,
  token: string
): Promise<void> {
  try {
    const response = await fetch(`/api/vendas/gestor/${vendaId}?incluirFiscal=false`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })
    if (!response.ok) return

    const data = await response.json()
    patchVendaUnificadaInfiniteCache(
      queryClient,
      queryKey,
      vendaId,
      extrairPatchKanbanDeRespostaTransicao(data)
    )
  } catch {
    /* falha silenciosa — cache otimista + patch da transição já atualizaram a UI */
  }
}
