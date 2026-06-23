'use client'

/**
 * Kanban delivery com paginação por coluna (15 pedidos iniciais + scroll incremental).
 * Delta poll (~30s) atualiza caches de cada coluna sem refetch completo.
 */

import { useRef, useEffect, useMemo, useCallback } from 'react'
import {
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import { KANBAN_DELIVERY_COLUMN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { StatusDeliveryApi } from '@/src/application/dto/api/pedidoDeliveryApi'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type { ColunaKanbanId } from '../types'
import {
  DELIVERY_KANBAN_COLUMN_IDS,
  buildPedidosDeliveryParamsForKanbanColumn,
  vendaPertenceColunaDeliveryKanban,
} from '../utils/kanbanDeliveryColumnConfig'
import type { VendaUnificadaDTO } from './useVendasUnificadas'
import {
  fetchPedidosDeliveryPagina,
  flattenPedidosDeliveryInfinite,
  type PedidosDeliveryInfiniteOptions,
  type PedidosDeliveryInfinitePage,
  type PedidosDeliveryInfiniteParams,
} from './usePedidosDeliveryInfinite'
import {
  pedidosDeliveryKanbanColumnQueryKey,
  usePedidosDeliveryKanbanColumnInfinite,
} from './usePedidosDeliveryKanbanColumnInfinite'

const STATUS_ATIVOS_DELTA: StatusDeliveryApi[] = [
  'PENDENTE',
  'EM_PREPARO',
  'PRONTO',
  'EM_ROTA',
]

function deduplicarItemsPorId(items: VendaUnificadaDTO[]): VendaUnificadaDTO[] {
  const map = new Map<string, VendaUnificadaDTO>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

function itemModificadoDesde(item: VendaUnificadaDTO, desdeIso: string): boolean {
  const desde = new Date(desdeIso).getTime()
  if (!Number.isFinite(desde)) return true
  const mod = new Date(item.dataUltimaModificacao ?? item.dataCriacao).getTime()
  if (!Number.isFinite(mod)) return true
  return mod >= desde
}

async function fetchPedidosDeliveryItems(
  params: PedidosDeliveryInfiniteParams,
  token: string,
  queryClient: QueryClient,
  signal?: AbortSignal
): Promise<VendaUnificadaDTO[]> {
  const page = await fetchPedidosDeliveryPagina(
    params,
    0,
    KANBAN_DELIVERY_COLUMN_PAGE_SIZE,
    token,
    signal,
    queryClient
  )
  return page.items
}

async function fetchDeltaPedidosDelivery(
  lastPollAt: string,
  token: string,
  queryClient: QueryClient,
  signal?: AbortSignal
): Promise<VendaUnificadaDTO[]> {
  const base = {
    cancelado: false as const,
    offset: 0,
    limit: KANBAN_DELIVERY_COLUMN_PAGE_SIZE,
  }

  const [ativosRaw, finalizados] = await Promise.all([
    fetchPedidosDeliveryItems(
      { ...base, statusDelivery: STATUS_ATIVOS_DELTA },
      token,
      queryClient,
      signal
    ),
    fetchPedidosDeliveryItems(
      { ...base, statusDelivery: 'FINALIZADO', dataFinalizacaoInicio: lastPollAt },
      token,
      queryClient,
      signal
    ),
  ])

  const ativosModificados = ativosRaw.filter(item => itemModificadoDesde(item, lastPollAt))
  return deduplicarItemsPorId([...ativosModificados, ...finalizados])
}

function mergeDeltaIntoColumnPages(
  current: InfiniteData<PedidosDeliveryInfinitePage> | undefined,
  columnId: ColunaKanbanId,
  deltaItems: VendaUnificadaDTO[],
  getEtapaKanban: (v: VendaUnificadaDTO) => string
): InfiniteData<PedidosDeliveryInfinitePage> | undefined {
  const deltaMap = new Map(deltaItems.map(i => [i.id, i]))

  if (!current?.pages?.length) {
    const novos = deltaItems.filter(i =>
      vendaPertenceColunaDeliveryKanban(i, columnId, getEtapaKanban)
    )
    if (novos.length === 0) return current

    return {
      pages: [
        {
          items: novos,
          count: novos.length,
          page: 1,
          limit: KANBAN_DELIVERY_COLUMN_PAGE_SIZE,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      ],
      pageParams: [0],
    }
  }

  const updatedPages = current.pages.map(page => ({
    ...page,
    items: page.items
      .map(item => {
        if (!deltaMap.has(item.id)) return item
        const atualizado = deltaMap.get(item.id) as VendaUnificadaDTO
        if (!vendaPertenceColunaDeliveryKanban(atualizado, columnId, getEtapaKanban)) {
          return null
        }
        return atualizado
      })
      .filter((item): item is VendaUnificadaDTO => item != null),
  }))

  const existingIds = new Set(updatedPages.flatMap(p => p.items.map(i => i.id)))
  const novosNaColuna = deltaItems.filter(
    i =>
      !existingIds.has(i.id) &&
      vendaPertenceColunaDeliveryKanban(i, columnId, getEtapaKanban)
  )

  if (novosNaColuna.length === 0) {
    return { ...current, pages: updatedPages }
  }

  const firstPage = updatedPages[0]
  return {
    ...current,
    pages: [
      {
        ...firstPage,
        items: [...novosNaColuna, ...firstPage.items],
        count: firstPage.count + novosNaColuna.length,
      },
      ...updatedPages.slice(1),
    ],
  }
}

export interface PedidosDeliveryKanbanColumnState {
  data: InfiniteData<PedidosDeliveryInfinitePage> | undefined
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => Promise<unknown>
  totalCount: number
}

export function usePedidosDeliveryKanbanColumns(
  params: PedidosDeliveryInfiniteParams,
  options?: PedidosDeliveryInfiniteOptions & {
    getEtapaKanban?: (v: VendaUnificadaDTO) => string
  }
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()

  const lastPollAtRef = useRef<string | null>(null)
  const tokenRef = useRef(token)
  tokenRef.current = token

  const getEtapaKanban = useCallback(
    (v: VendaUnificadaDTO) => options?.getEtapaKanban?.(v) ?? v.getEtapaKanban(),
    [options?.getEtapaKanban]
  )

  const enabled = options?.enabled !== false && !!token
  const columnInfiniteOptions = {
    enabled,
    enviarFiltroCriacaoNaApi: options?.enviarFiltroCriacaoNaApi,
  }

  const novosQuery = usePedidosDeliveryKanbanColumnInfinite('NOVOS_PEDIDOS', params, columnInfiniteOptions)
  const preparoQuery = usePedidosDeliveryKanbanColumnInfinite('EM_PREPARO', params, columnInfiniteOptions)
  const prontoQuery = usePedidosDeliveryKanbanColumnInfinite('PRONTO_ENTREGA', params, columnInfiniteOptions)
  const rotaQuery = usePedidosDeliveryKanbanColumnInfinite('EM_ROTA', params, columnInfiniteOptions)
  const finalizadasQuery = usePedidosDeliveryKanbanColumnInfinite('FINALIZADAS', params, columnInfiniteOptions)
  const comNfeQuery = usePedidosDeliveryKanbanColumnInfinite('COM_NFE', params, columnInfiniteOptions)

  const queryByColumn: Record<ColunaKanbanId, typeof novosQuery> = {
    NOVOS_PEDIDOS: novosQuery,
    EM_PREPARO: preparoQuery,
    PRONTO_ENTREGA: prontoQuery,
    EM_ROTA: rotaQuery,
    FINALIZADAS: finalizadasQuery,
    PENDENTE_EMISSAO: finalizadasQuery,
    COM_NFE: comNfeQuery,
  }

  const queryByColumnRef = useRef(queryByColumn)
  queryByColumnRef.current = queryByColumn

  const columnQueryKeys = useMemo(() => {
    const keys: Partial<Record<ColunaKanbanId, readonly unknown[]>> = {}
    for (const columnId of DELIVERY_KANBAN_COLUMN_IDS) {
      const columnParams = buildPedidosDeliveryParamsForKanbanColumn(columnId, params, {
        enviarFiltroCriacaoNaApi: options?.enviarFiltroCriacaoNaApi,
      })
      keys[columnId] = pedidosDeliveryKanbanColumnQueryKey(columnId, columnParams, empresaId)
    }
    return keys
  }, [params, empresaId, options?.enviarFiltroCriacaoNaApi])

  const columnQueryKeysStr = useMemo(() => JSON.stringify(columnQueryKeys), [columnQueryKeys])
  const prevKeysStrRef = useRef(columnQueryKeysStr)
  if (prevKeysStrRef.current !== columnQueryKeysStr) {
    prevKeysStrRef.current = columnQueryKeysStr
    lastPollAtRef.current = null
  }

  useEffect(() => {
    if (!enabled) return
    const algumaColunaCarregada = DELIVERY_KANBAN_COLUMN_IDS.some(
      id => queryByColumn[id]?.data?.pages?.length
    )
    if (algumaColunaCarregada && !lastPollAtRef.current) {
      lastPollAtRef.current = new Date().toISOString()
    }
  }, [
    enabled,
    novosQuery.data,
    preparoQuery.data,
    prontoQuery.data,
    rotaQuery.data,
    finalizadasQuery.data,
    comNfeQuery.data,
  ])

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

        for (const columnId of DELIVERY_KANBAN_COLUMN_IDS) {
          const queryKey = columnQueryKeys[columnId]
          if (!queryKey) continue
          queryClient.setQueryData<InfiniteData<PedidosDeliveryInfinitePage>>(
            queryKey,
            current =>
              mergeDeltaIntoColumnPages(
                current as InfiniteData<PedidosDeliveryInfinitePage> | undefined,
                columnId,
                deltaItems,
                getEtapaKanban
              )
          )
        }

        lastPollAtRef.current = pollStartedAt
      } catch {
        /* próximo tick */
      }
    }

    const id = setInterval(() => void runDelta(), refetchIntervalMs)
    return () => clearInterval(id)
  }, [enabled, refetchIntervalMs, columnQueryKeysStr, columnQueryKeys, queryClient, getEtapaKanban])

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
          if (deltaItems.length === 0) {
            lastPollAtRef.current = pollStartedAt
            return
          }

          for (const columnId of DELIVERY_KANBAN_COLUMN_IDS) {
            const queryKey = columnQueryKeys[columnId]
            if (!queryKey) continue
            queryClient.setQueryData<InfiniteData<PedidosDeliveryInfinitePage>>(
              queryKey,
              current =>
                mergeDeltaIntoColumnPages(
                  current as InfiniteData<PedidosDeliveryInfinitePage> | undefined,
                  columnId,
                  deltaItems,
                  getEtapaKanban
                )
            )
          }
          lastPollAtRef.current = pollStartedAt
        } catch {
          /* falha silenciosa */
        }
      })()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [enabled, refetchOnWindowFocus, columnQueryKeysStr, columnQueryKeys, queryClient, getEtapaKanban])

  const columnStates = useMemo((): Partial<Record<ColunaKanbanId, PedidosDeliveryKanbanColumnState>> => {
    const map: Partial<Record<ColunaKanbanId, PedidosDeliveryKanbanColumnState>> = {}

    for (const columnId of DELIVERY_KANBAN_COLUMN_IDS) {
      const query = queryByColumn[columnId]
      const { totalCount } = flattenPedidosDeliveryInfinite(query.data)
      const apiCount = query.data?.pages?.[0]?.count ?? totalCount

      map[columnId] = {
        data: query.data,
        isLoading: query.isLoading,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage ?? false,
        fetchNextPage: query.fetchNextPage,
        totalCount: apiCount,
      }
    }

    return map
  }, [
    novosQuery.data,
    novosQuery.isLoading,
    novosQuery.isFetchingNextPage,
    novosQuery.hasNextPage,
    preparoQuery.data,
    preparoQuery.isLoading,
    preparoQuery.isFetchingNextPage,
    preparoQuery.hasNextPage,
    prontoQuery.data,
    prontoQuery.isLoading,
    prontoQuery.isFetchingNextPage,
    prontoQuery.hasNextPage,
    rotaQuery.data,
    rotaQuery.isLoading,
    rotaQuery.isFetchingNextPage,
    rotaQuery.hasNextPage,
    finalizadasQuery.data,
    finalizadasQuery.isLoading,
    finalizadasQuery.isFetchingNextPage,
    finalizadasQuery.hasNextPage,
    comNfeQuery.data,
    comNfeQuery.isLoading,
    comNfeQuery.isFetchingNextPage,
    comNfeQuery.hasNextPage,
  ])

  const isLoading = DELIVERY_KANBAN_COLUMN_IDS.some(id => queryByColumn[id]?.isLoading)

  const flattenAllItems = useCallback((): VendaUnificadaDTO[] => {
    const all: VendaUnificadaDTO[] = []
    for (const columnId of DELIVERY_KANBAN_COLUMN_IDS) {
      const { items } = flattenPedidosDeliveryInfinite(queryByColumn[columnId]?.data)
      all.push(...items)
    }
    return deduplicarItemsPorId(all)
  }, [
    novosQuery.data,
    preparoQuery.data,
    prontoQuery.data,
    rotaQuery.data,
    finalizadasQuery.data,
    comNfeQuery.data,
  ])

  const refetch = useCallback(async () => {
    lastPollAtRef.current = null
    await Promise.all(DELIVERY_KANBAN_COLUMN_IDS.map(id => queryByColumn[id]?.refetch()))
  }, [novosQuery, preparoQuery, prontoQuery, rotaQuery, finalizadasQuery, comNfeQuery])

  const fetchNextPageForColumn = useCallback((columnId: ColunaKanbanId) => {
    const query = queryByColumnRef.current[columnId]
    if (!query || query.isFetchingNextPage || !query.hasNextPage) return
    void query.fetchNextPage()
  }, [])

  return useMemo(
    () => ({
      columnStates,
      columnQueryKeys,
      isLoading,
      refetch,
      flattenAllItems,
      fetchNextPageForColumn,
    }),
    [
      columnStates,
      columnQueryKeys,
      isLoading,
      refetch,
      flattenAllItems,
      fetchNextPageForColumn,
    ]
  )
}
