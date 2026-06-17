import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { KanbanVendaCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'
import { extrairPatchKanbanDeRespostaTransicao } from '@/src/application/mappers/TransicaoPedidoDeliveryMapper'

export type { KanbanVendaCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'
export { extrairPatchKanbanDeRespostaTransicao }

import {
  VendaUnificadaDTO,
  type VendasUnificadasResponse,
} from '@/src/presentation/hooks/useVendasUnificadas'

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
    venda.solicitarEmissaoFiscal,
    venda.statusFiscal,
    venda.documentoFiscalId,
    venda.abertoPor,
    venda.numeroFiscal,
    venda.serieFiscal,
    venda.dataEmissaoFiscal,
    venda.tipoDocFiscal,
    venda.modelo,
    venda.retornoSefaz,
    patch.statusEtapaOperacional !== undefined
      ? patch.statusEtapaOperacional
      : venda.statusEtapaOperacional,
    patch.dataUltimaModificacao !== undefined
      ? patch.dataUltimaModificacao
      : venda.dataUltimaModificacao,
    patch.statusFinanceiro !== undefined ? patch.statusFinanceiro : venda.statusFinanceiro
  )
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
