'use client'

/**
 * Estratégia de sincronização otimizada do Kanban delivery:
 *
 * CARGA INICIAL (1 requisição)
 *   GET /api/delivery/pedidos
 *     ?statusDelivery=PENDENTE&statusDelivery=EM_PREPARO&statusDelivery=PRONTO&statusDelivery=EM_ROTA
 *     &cancelado=false
 *     &limit=100
 *
 * RE-POLL (delta — só o que mudou)
 *   GET /api/delivery/pedidos
 *     ?dataUltimaModificacaoInicial=<isoTimestamp>
 *     &cancelado=false
 *     &limit=100
 *
 * Filtros de data da toolbar são aplicados client-side (não vão na API).
 */

import { useRef, useEffect, useMemo, useCallback } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import {
  montarPedidosDeliveryQueryParams,
  serializarPedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListQuery'
import { KANBAN_DELIVERY_SYNC_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import {
  mapPedidosDeliveryListResponseParaVendaUnificadaDTO,
  normalizarPedidosDeliveryListResponse,
} from '@/src/application/mappers/PedidoDeliveryListMapper'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { preservarObservacoesKanbanCacheNosItems } from '../utils/kanbanVendaCacheUpdate'
import type { VendaUnificadaDTO } from './useVendasUnificadas'
import {
  fetchPedidosDeliveryPagina,
  getNextOffsetPedidosDelivery,
  pedidosDeliveryInfiniteQueryKey,
  type PedidosDeliveryInfiniteOptions,
  type PedidosDeliveryInfinitePage,
  type PedidosDeliveryInfiniteParams,
} from './usePedidosDeliveryInfinite'

/** Statuses carregados na carga inicial (foco operacional — FINALIZADO chega pelo delta). */
const STATUS_ATIVOS_KANBAN_DELIVERY: StatusDeliveryApi[] = [
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
  'EM_ROTA',
]

/** Params para API operacional — sem datas (toolbar filtra client-side). */
function paramsApiOperacionaisDeliveryKanban(
  params: PedidosDeliveryInfiniteParams
): PedidosDeliveryInfiniteParams {
  const {
    dataCriacaoInicial: _ci,
    dataCriacaoFinal: _cf,
    dataFinalizacaoInicio: _fi,
    dataFinalizacaoFim: _ff,
    dataUltimaModificacaoInicial: _du,
    ...rest
  } = params
  return rest
}

// ---------------------------------------------------------------------------
// Funções auxiliares
// ---------------------------------------------------------------------------

/** Busca delta de pedidos modificados desde `dataUltimaModificacaoInicial`. */
async function fetchDeltaPedidosDelivery(
  dataUltimaModificacaoInicial: string,
  token: string,
  queryClient: QueryClient,
  signal?: AbortSignal
): Promise<VendaUnificadaDTO[]> {
  const queryParams = montarPedidosDeliveryQueryParams({
    dataUltimaModificacaoInicial,
    cancelado: false,
    offset: 0,
    limit: KANBAN_DELIVERY_SYNC_PAGE_SIZE,
  })
  const qs = serializarPedidosDeliveryQueryParams(queryParams).toString()

  const response = await fetchGestorApi(`/api/delivery/pedidos?${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Delta poll: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  const normalizado = normalizarPedidosDeliveryListResponse(data)
  const mapeado = mapPedidosDeliveryListResponseParaVendaUnificadaDTO(normalizado)
  return preservarObservacoesKanbanCacheNosItems(queryClient, mapeado.items)
}

/**
 * Mergeia items delta no InfiniteData do Kanban:
 * - Itens existentes → atualizados no lugar
 * - Itens novos      → inseridos no início da primeira página
 * - Cache vazio      → bootstrap com os itens delta
 */
function mergeDeltaIntoInfinitePages(
  current: InfiniteData<PedidosDeliveryInfinitePage> | undefined,
  deltaItems: VendaUnificadaDTO[]
): InfiniteData<PedidosDeliveryInfinitePage> | undefined {
  if (deltaItems.length === 0) return current

  if (!current?.pages?.length) {
    return {
      pages: [
        {
          items: deltaItems,
          count: deltaItems.length,
          page: 1,
          limit: KANBAN_DELIVERY_SYNC_PAGE_SIZE,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      ],
      pageParams: [0],
    }
  }

  const deltaMap = new Map(deltaItems.map(i => [i.id, i]))

  const updatedPages = current.pages.map(page => ({
    ...page,
    items: page.items.map(item =>
      deltaMap.has(item.id) ? (deltaMap.get(item.id) as VendaUnificadaDTO) : item
    ),
  }))

  const existingIds = new Set(current.pages.flatMap(p => p.items.map(i => i.id)))
  const newItems = deltaItems.filter(i => !existingIds.has(i.id))

  if (newItems.length === 0) {
    return { ...current, pages: updatedPages }
  }

  const firstPage = updatedPages[0]
  return {
    ...current,
    pages: [
      {
        ...firstPage,
        items: [...newItems, ...firstPage.items],
        count: firstPage.count + newItems.length,
      },
      ...updatedPages.slice(1),
    ],
  }
}

// ---------------------------------------------------------------------------
// Hook principal
// ---------------------------------------------------------------------------

export function usePedidosDeliveryKanbanSync(
  params: PedidosDeliveryInfiniteParams,
  options?: PedidosDeliveryInfiniteOptions
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()

  const lastPollAtRef = useRef<string | null>(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  const queryKey = pedidosDeliveryInfiniteQueryKey(params, empresaId)
  const enabled = options?.enabled !== false && !!token

  const queryKeyStr = useMemo(() => JSON.stringify(queryKey), [queryKey])
  const prevQueryKeyRef = useRef(queryKeyStr)
  if (prevQueryKeyRef.current !== queryKeyStr) {
    prevQueryKeyRef.current = queryKeyStr
    lastPollAtRef.current = null
  }

  const query = useInfiniteQuery<
    PedidosDeliveryInfinitePage,
    Error,
    InfiniteData<PedidosDeliveryInfinitePage>,
    readonly unknown[],
    number
  >({
    queryKey,
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: async ({ pageParam, signal }) => {
      const pollStartedAt = new Date().toISOString()
      const paramsApi = paramsApiOperacionaisDeliveryKanban(params)

      const paramsComStatus: PedidosDeliveryInfiniteParams =
        pageParam === 0
          ? { ...paramsApi, statusDelivery: STATUS_ATIVOS_KANBAN_DELIVERY }
          : paramsApi

      const result = await fetchPedidosDeliveryPagina(
        paramsComStatus,
        pageParam,
        KANBAN_DELIVERY_SYNC_PAGE_SIZE,
        tokenRef.current!,
        signal,
        queryClient
      )

      if (pageParam === 0) {
        lastPollAtRef.current = pollStartedAt
      }

      return result
    },
    getNextPageParam: (lastPage, allPages) => getNextOffsetPedidosDelivery(lastPage, allPages),
    enabled,
    retry: 2,
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  })

  const refetchIntervalMs =
    typeof options?.refetchIntervalMs === 'number' ? options.refetchIntervalMs : null

  useEffect(() => {
    if (!enabled || !refetchIntervalMs) return

    const runDelta = async () => {
      const currentToken = tokenRef.current
      if (!currentToken || !lastPollAtRef.current) return

      const pollStartedAt = new Date().toISOString()
      try {
        const deltaItems = await fetchDeltaPedidosDelivery(
          lastPollAtRef.current,
          currentToken,
          queryClient
        )
        queryClient.setQueryData<InfiniteData<PedidosDeliveryInfinitePage>>(
          queryKey,
          current =>
            mergeDeltaIntoInfinitePages(
              current as InfiniteData<PedidosDeliveryInfinitePage> | undefined,
              deltaItems
            )
        )
        lastPollAtRef.current = pollStartedAt
      } catch {
        // Falha silenciosa — próximo tick tentará novamente
      }
    }

    const id = setInterval(() => void runDelta(), refetchIntervalMs)
    return () => clearInterval(id)
  }, [enabled, refetchIntervalMs, queryKeyStr, queryKey, queryClient])

  const refetchOnWindowFocus = options?.refetchOnWindowFocus ?? false

  useEffect(() => {
    if (!enabled || !refetchOnWindowFocus) return

    const handleFocus = () => {
      const currentToken = tokenRef.current
      if (!currentToken || !lastPollAtRef.current) return

      const pollStartedAt = new Date().toISOString()
      void (async () => {
        try {
          const deltaItems = await fetchDeltaPedidosDelivery(
            lastPollAtRef.current!,
            currentToken,
            queryClient
          )
          if (deltaItems.length > 0) {
            queryClient.setQueryData<InfiniteData<PedidosDeliveryInfinitePage>>(
              queryKey,
              current =>
                mergeDeltaIntoInfinitePages(
                  current as InfiniteData<PedidosDeliveryInfinitePage> | undefined,
                  deltaItems
                )
            )
          }
          lastPollAtRef.current = pollStartedAt
        } catch {
          // Falha silenciosa
        }
      })()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, refetchOnWindowFocus, queryKeyStr, queryKey, queryClient])

  const refetch = useCallback(async () => {
    lastPollAtRef.current = null
    await queryClient.resetQueries({ queryKey, exact: true })
    return query.refetch()
  }, [query, queryClient, queryKey])

  return { ...query, refetch }
}
