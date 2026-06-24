import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { ColunaKanbanId } from '../types'
import type { PedidosDeliveryInfinitePage } from '../hooks/usePedidosDeliveryInfinite'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'
import { KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY } from '../hooks/kanbanListagemQueryCache'
import {
  extrairColumnIdDePedidosDeliveryKanbanQueryKey,
  vendaPertenceColunaDeliveryKanban,
} from './kanbanDeliveryColumnConfig'
import { cloneVendaUnificadaDTO } from './kanbanVendaCacheUpdate'
import type { KanbanVendaCachePatch } from '@/src/application/dto/TransicaoKanbanDTO'

function removerVendaDasPaginas(
  data: InfiniteData<PedidosDeliveryInfinitePage> | undefined,
  vendaId: string
): InfiniteData<PedidosDeliveryInfinitePage> | undefined {
  if (!data?.pages?.length) return data

  const pages = data.pages.map(page => ({
    ...page,
    items: page.items.filter(item => item.id !== vendaId),
  }))

  return { ...data, pages }
}

function inserirVendaNaPrimeiraPagina(
  data: InfiniteData<PedidosDeliveryInfinitePage> | undefined,
  venda: VendaUnificadaDTO
): InfiniteData<PedidosDeliveryInfinitePage> {
  if (!data?.pages?.length) {
    return {
      pages: [
        {
          items: [venda],
          count: 1,
          page: 1,
          limit: 15,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      ],
      pageParams: [0],
    }
  }

  const firstPage = data.pages[0]
  const restantes = firstPage.items.filter(item => item.id !== venda.id)

  return {
    ...data,
    pages: [
      {
        ...firstPage,
        items: [venda, ...restantes],
      },
      ...data.pages.slice(1).map(page => ({
        ...page,
        items: page.items.filter(item => item.id !== venda.id),
      })),
    ],
  }
}

function etapaKanbanDeliveryCache(v: VendaUnificadaDTO): string {
  return v.getEtapaKanban()
}

/** Substitui ou move o card entre caches de colunas após transição de status. */
export function upsertVendaDeliveryKanbanColumnCaches(
  queryClient: QueryClient,
  venda: VendaUnificadaDTO
): void {
  const queries = queryClient.getQueriesData<InfiniteData<PedidosDeliveryInfinitePage>>({
    queryKey: KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY,
  })

  for (const [queryKey, data] of queries) {
    const columnId = extrairColumnIdDePedidosDeliveryKanbanQueryKey(queryKey)
    if (!columnId) continue

    const pertence = vendaPertenceColunaDeliveryKanban(venda, columnId, etapaKanbanDeliveryCache)

    if (!pertence) {
      const semVenda = removerVendaDasPaginas(data, venda.id)
      if (semVenda !== data) {
        queryClient.setQueryData(queryKey, semVenda)
      }
      continue
    }

    const comVenda = inserirVendaNaPrimeiraPagina(
      removerVendaDasPaginas(data, venda.id),
      venda
    )
    queryClient.setQueryData(queryKey, comVenda)
  }
}

/** Aplica patch em todas as colunas; remove o card se a etapa mudou de coluna. */
export function patchVendaDeliveryKanbanColumnCaches(
  queryClient: QueryClient,
  vendaId: string,
  patch: KanbanVendaCachePatch
): boolean {
  let encontrou = false
  let vendaAtualizada: VendaUnificadaDTO | null = null

  const queries = queryClient.getQueriesData<InfiniteData<PedidosDeliveryInfinitePage>>({
    queryKey: KANBAN_PEDIDOS_DELIVERY_INFINITE_QUERY_KEY,
  })

  for (const [queryKey, data] of queries) {
    if (!data?.pages?.length) continue
    const columnId = extrairColumnIdDePedidosDeliveryKanbanQueryKey(queryKey)
    if (!columnId) continue

    for (const page of data.pages) {
      for (const item of page.items) {
        if (item.id === vendaId) {
          encontrou = true
          vendaAtualizada = cloneVendaUnificadaDTO(item, patch)
          break
        }
      }
      if (vendaAtualizada) break
    }
  }

  if (!encontrou || !vendaAtualizada) return false

  upsertVendaDeliveryKanbanColumnCaches(queryClient, vendaAtualizada)
  return true
}
