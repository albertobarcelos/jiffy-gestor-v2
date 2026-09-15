import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { ColunaKanbanId } from '../types'
import type { PedidosDeliveryInfinitePage } from '../hooks/usePedidosDeliveryInfinite'
import type { VendaUnificadaDTO } from '../hooks/useVendasUnificadas'
import { kanbanPedidosDeliveryInfiniteQueryFilter } from '../hooks/kanbanListagemQueryCache'
import {
  DELIVERY_KANBAN_COLUMN_IDS,
  extrairColumnIdDePedidosDeliveryKanbanQueryKey,
  vendaPertenceColunaDeliveryKanban,
} from './kanbanDeliveryColumnConfig'
import {
  cloneVendaUnificadaDTO,
  extrairPatchKanbanDeRespostaTransicao,
  extrairVendaUnificadaDeRespostaDeliverySummary,
} from './kanbanVendaCacheUpdate'
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

/**
 * `true` se o card mapeia para alguma coluna conhecida do Kanban delivery.
 * Quando `false` (etapa ambígua/`'ABERTA'`), o card não pertence a nenhuma coluna e
 * um upsert o removeria de todos os caches, fazendo-o "sumir" da tela até o reload.
 */
export function vendaPertenceAlgumaColunaDeliveryKanban(venda: VendaUnificadaDTO): boolean {
  return DELIVERY_KANBAN_COLUMN_IDS.some(columnId =>
    vendaPertenceColunaDeliveryKanban(venda, columnId, etapaKanbanDeliveryCache)
  )
}

/**
 * Nivel A/C realtime: aplica PEDIDO_DELIVERY_CRIADO so na coluna do status (sem varredura).
 * @returns true se o summary virou card em coluna conhecida; false = caller deve invalidar.
 */
export function aplicarPedidoDeliveryCriadoNoKanbanCache(
  queryClient: QueryClient,
  payload: unknown
): boolean {
  const card = extrairVendaUnificadaDeRespostaDeliverySummary(payload)
  if (!card) return false

  const colunaAlvo = DELIVERY_KANBAN_COLUMN_IDS.find(columnId =>
    vendaPertenceColunaDeliveryKanban(card, columnId, etapaKanbanDeliveryCache)
  )
  if (!colunaAlvo) return false

  const queries = queryClient.getQueriesData<InfiniteData<PedidosDeliveryInfinitePage>>(
    kanbanPedidosDeliveryInfiniteQueryFilter()
  )

  for (const [queryKey, data] of queries) {
    const columnId = extrairColumnIdDePedidosDeliveryKanbanQueryKey(queryKey)
    if (columnId !== colunaAlvo) continue
    queryClient.setQueryData(queryKey, inserirVendaNaPrimeiraPagina(data, card))
  }
  // Summary valido: sucesso mesmo sem query da coluna montada (evita invalidate cego).
  return true
}

/**
 * Remove o card de todas as colunas delivery (ex.: CANCELADO).
 * @returns true se removeu de pelo menos uma query.
 */
export function removerVendaDeliveryKanbanColumnCaches(
  queryClient: QueryClient,
  vendaId: string
): boolean {
  const id = vendaId.trim()
  if (!id) return false

  const queries = queryClient.getQueriesData<InfiniteData<PedidosDeliveryInfinitePage>>(
    kanbanPedidosDeliveryInfiniteQueryFilter()
  )

  let removeu = false
  for (const [queryKey, data] of queries) {
    const columnId = extrairColumnIdDePedidosDeliveryKanbanQueryKey(queryKey)
    if (!columnId) continue
    const semVenda = removerVendaDasPaginas(data, id)
    if (semVenda !== data) {
      queryClient.setQueryData(queryKey, semVenda)
      removeu = true
    }
  }
  return removeu
}

/**
 * Nivel D realtime: aplica PEDIDO_DELIVERY_STATUS_ALTERADO (move ou remove).
 * @returns true se aplicou no cache; false = caller deve invalidar.
 */
export function aplicarPedidoDeliveryStatusAlteradoNoKanbanCache(
  queryClient: QueryClient,
  payload: unknown
): boolean {
  const card = extrairVendaUnificadaDeRespostaDeliverySummary(payload)
  if (!card) return false

  const statusOp = String(card.statusEtapaOperacional ?? '')
    .trim()
    .toUpperCase()
  // CANCELADO nao tem coluna operacional; getEtapaKanban pode cair em NOVOS_PEDIDOS.
  if (statusOp === 'CANCELADO' || statusOp === 'CANCELADA') {
    removerVendaDeliveryKanbanColumnCaches(queryClient, card.id)
    return true
  }

  if (!vendaPertenceAlgumaColunaDeliveryKanban(card)) {
    removerVendaDeliveryKanbanColumnCaches(queryClient, card.id)
    return true
  }

  upsertVendaDeliveryKanbanColumnCaches(queryClient, card)
  return true
}

/** Substitui ou move o card entre caches de colunas após transição de status. */
export function upsertVendaDeliveryKanbanColumnCaches(
  queryClient: QueryClient,
  venda: VendaUnificadaDTO
): void {
  // Defesa: card sem coluna conhecida não deve ser removido de onde está (evita sumiço).
  if (!vendaPertenceAlgumaColunaDeliveryKanban(venda)) return

  const queries = queryClient.getQueriesData<InfiniteData<PedidosDeliveryInfinitePage>>(
    kanbanPedidosDeliveryInfiniteQueryFilter()
  )

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

  const queries = queryClient.getQueriesData<InfiniteData<PedidosDeliveryInfinitePage>>(
    kanbanPedidosDeliveryInfiniteQueryFilter()
  )

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

/** Localiza um card em qualquer cache de coluna delivery (útil quando o patch não encontra o item). */
export function encontrarVendaNasColunasDeliveryKanban(
  queryClient: QueryClient,
  vendaId: string
): VendaUnificadaDTO | null {
  const queries = queryClient.getQueriesData<InfiniteData<PedidosDeliveryInfinitePage>>(
    kanbanPedidosDeliveryInfiniteQueryFilter()
  )

  for (const [, data] of queries) {
    if (!data?.pages?.length) continue
    for (const page of data.pages) {
      const item = page.items.find(i => i.id === vendaId)
      if (item) return item
    }
  }

  return null
}

/** Status operacional (`statusDelivery`) esperado em cada coluna destino do Kanban. */
const STATUS_OPERACIONAL_POR_COLUNA_DESTINO: Partial<Record<ColunaKanbanId, string>> = {
  NOVOS_PEDIDOS: 'PENDENTE',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO_ENTREGA: 'PRONTO',
  EM_ROTA: 'EM_ROTA',
  FINALIZADAS: 'FINALIZADO',
}

/**
 * Garante que o patch carregue a etapa operacional do destino quando a resposta da transição
 * não devolve `statusDelivery`. Sem isso, o card perde a etapa, `getEtapaKanban()` cai em `'ABERTA'`
 * e o card é filtrado de todas as colunas (some até recarregar).
 */
function aplicarStatusDestinoNoPatch(
  patch: KanbanVendaCachePatch,
  colunaDestino?: ColunaKanbanId | null
): KanbanVendaCachePatch {
  if (!colunaDestino) return patch
  if (String(patch.statusEtapaOperacional ?? '').trim()) return patch

  const statusDestino = STATUS_OPERACIONAL_POR_COLUNA_DESTINO[colunaDestino]
  if (!statusDestino) return patch

  const ehFinalizado = statusDestino === 'FINALIZADO'
  return {
    ...patch,
    statusEtapaOperacional: statusDestino,
    dataFinalizacao: ehFinalizado
      ? (patch.dataFinalizacao ?? new Date().toISOString())
      : patch.dataFinalizacao,
  }
}

/**
 * Sincroniza caches de coluna após transição delivery.
 * 1) summary completo → upsert; 2) patch no card existente; 3) merge fallback + patch + upsert.
 *
 * `colunaDestino` (quando conhecida) força a etapa operacional caso a resposta não a traga,
 * evitando que o card caia em `'ABERTA'` e suma da tela.
 */
export function sincronizarVendaDeliveryKanbanColumnCaches(
  queryClient: QueryClient,
  vendaId: string,
  respostaTransicao: unknown,
  fallbackVenda?: VendaUnificadaDTO | null,
  colunaDestino?: ColunaKanbanId | null
): boolean {
  const cardAtualizado = extrairVendaUnificadaDeRespostaDeliverySummary(respostaTransicao)
  const cardSummaryUtilizavel =
    cardAtualizado != null && vendaPertenceAlgumaColunaDeliveryKanban(cardAtualizado)

  if (cardAtualizado && cardSummaryUtilizavel) {
    upsertVendaDeliveryKanbanColumnCaches(queryClient, cardAtualizado)
    return true
  }

  const patch = aplicarStatusDestinoNoPatch(
    extrairPatchKanbanDeRespostaTransicao(respostaTransicao),
    colunaDestino
  )

  const base = fallbackVenda ?? encontrarVendaNasColunasDeliveryKanban(queryClient, vendaId)
  if (base) {
    const merged = cloneVendaUnificadaDTO(base, patch)
    if (vendaPertenceAlgumaColunaDeliveryKanban(merged)) {
      upsertVendaDeliveryKanbanColumnCaches(queryClient, merged)
      return true
    }
  }

  // Último recurso: patch direto no cache (mantém comportamento anterior se nada acima resolveu).
  return patchVendaDeliveryKanbanColumnCaches(queryClient, vendaId, patch)
}
