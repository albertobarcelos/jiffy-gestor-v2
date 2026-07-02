'use client'

/**
 * Kanban balcão com paginação por coluna fiscal (50 itens iniciais + scroll incremental).
 * Espelha `usePedidosDeliveryKanbanColumns` — 1 query por coluna com `colunaKanban` na API.
 */

import { useCallback, useMemo, useRef } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type { ColunaKanbanId } from '../types'
import {
  BALCAO_KANBAN_COLUMN_IDS,
  buildVendasUnificadasParamsForKanbanColumn,
  type ColunaKanbanBalcaoApi,
} from '../utils/kanbanBalcaoColumnConfig'
import {
  flattenVendasUnificadasInfinite,
  type VendasUnificadasInfiniteOptions,
  type VendasUnificadasQueryParams,
  type VendasUnificadasResponse,
  type VendaUnificadaDTO,
} from './useVendasUnificadas'
import {
  useVendasUnificadasKanbanColumnInfinite,
  vendasUnificadasKanbanColumnQueryKey,
} from './useVendasUnificadasKanbanColumnInfinite'

function deduplicarItemsPorId(items: VendaUnificadaDTO[]): VendaUnificadaDTO[] {
  const map = new Map<string, VendaUnificadaDTO>()
  for (const item of items) {
    map.set(item.id, item)
  }
  return Array.from(map.values())
}

export interface VendasUnificadasKanbanColumnState {
  data: InfiniteData<VendasUnificadasResponse> | undefined
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  fetchNextPage: () => Promise<unknown>
  totalCount: number
}

export function useVendasUnificadasKanbanColumns(
  params: VendasUnificadasQueryParams,
  options?: VendasUnificadasInfiniteOptions & {
    enviarFiltroFinalizacaoNaApi?: boolean
  }
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()

  const enabled = options?.enabled !== false && !!token
  const columnInfiniteOptions = {
    enabled,
    enviarFiltroFinalizacaoNaApi: options?.enviarFiltroFinalizacaoNaApi,
    refetchIntervalMs: options?.refetchIntervalMs,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  }

  const finalizadasQuery = useVendasUnificadasKanbanColumnInfinite(
    'FINALIZADAS',
    params,
    columnInfiniteOptions
  )
  const pendenteQuery = useVendasUnificadasKanbanColumnInfinite(
    'PENDENTE_EMISSAO',
    params,
    columnInfiniteOptions
  )
  const comNfeQuery = useVendasUnificadasKanbanColumnInfinite('COM_NFE', params, columnInfiniteOptions)

  const queryByColumn: Record<ColunaKanbanBalcaoApi, typeof finalizadasQuery> = {
    FINALIZADAS: finalizadasQuery,
    PENDENTE_EMISSAO: pendenteQuery,
    COM_NFE: comNfeQuery,
  }

  const queryByColumnRef = useRef(queryByColumn)
  queryByColumnRef.current = queryByColumn

  const columnQueryKeys = useMemo(() => {
    const keys: Partial<Record<ColunaKanbanBalcaoApi, readonly unknown[]>> = {}
    for (const columnId of BALCAO_KANBAN_COLUMN_IDS) {
      const columnParams = buildVendasUnificadasParamsForKanbanColumn(columnId, params, {
        enviarFiltroFinalizacaoNaApi: options?.enviarFiltroFinalizacaoNaApi,
      })
      keys[columnId] = vendasUnificadasKanbanColumnQueryKey(columnId, columnParams, empresaId)
    }
    return keys
  }, [params, empresaId, options?.enviarFiltroFinalizacaoNaApi])

  const columnStates = useMemo((): Partial<
    Record<ColunaKanbanBalcaoApi, VendasUnificadasKanbanColumnState>
  > => {
    const map: Partial<Record<ColunaKanbanBalcaoApi, VendasUnificadasKanbanColumnState>> = {}

    for (const columnId of BALCAO_KANBAN_COLUMN_IDS) {
      const query = queryByColumn[columnId]
      const { totalCount } = flattenVendasUnificadasInfinite(query.data)
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
    finalizadasQuery.data,
    finalizadasQuery.isLoading,
    finalizadasQuery.isFetchingNextPage,
    finalizadasQuery.hasNextPage,
    pendenteQuery.data,
    pendenteQuery.isLoading,
    pendenteQuery.isFetchingNextPage,
    pendenteQuery.hasNextPage,
    comNfeQuery.data,
    comNfeQuery.isLoading,
    comNfeQuery.isFetchingNextPage,
    comNfeQuery.hasNextPage,
  ])

  const isLoading = BALCAO_KANBAN_COLUMN_IDS.some(id => queryByColumn[id]?.isLoading)

  const flattenAllItems = useCallback((): VendaUnificadaDTO[] => {
    const all: VendaUnificadaDTO[] = []
    for (const columnId of BALCAO_KANBAN_COLUMN_IDS) {
      const { items } = flattenVendasUnificadasInfinite(queryByColumn[columnId]?.data)
      all.push(...items)
    }
    return deduplicarItemsPorId(all)
  }, [finalizadasQuery.data, pendenteQuery.data, comNfeQuery.data])

  const refetch = useCallback(async () => {
    await Promise.all(
      BALCAO_KANBAN_COLUMN_IDS.map(async columnId => {
        const queryKey = columnQueryKeys[columnId]
        if (!queryKey) return
        await queryClient.resetQueries({ queryKey, exact: true })
      })
    )

    await Promise.all(
      BALCAO_KANBAN_COLUMN_IDS.map(columnId => queryByColumnRef.current[columnId]?.refetch())
    )
  }, [columnQueryKeys, queryClient])

  const fetchNextPageForColumn = useCallback((columnId: ColunaKanbanId) => {
    if (!(BALCAO_KANBAN_COLUMN_IDS as readonly ColunaKanbanId[]).includes(columnId)) return
    const query = queryByColumnRef.current[columnId as ColunaKanbanBalcaoApi]
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
    [columnStates, columnQueryKeys, isLoading, refetch, flattenAllItems, fetchNextPageForColumn]
  )
}
