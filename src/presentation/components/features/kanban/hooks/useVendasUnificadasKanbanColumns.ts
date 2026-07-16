'use client'

/**
 * Kanban balcão com paginação por coluna fiscal (50 itens iniciais + scroll incremental).
 * Padrão: COM_NFE + FINALIZADAS. Filtros PENDENTE_EMISSAO / REJEITADAS sob demanda.
 */

import { useCallback, useMemo, useRef } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type { ColunaKanbanFiltroExtra, ColunaKanbanId } from '../types'
import {
  BALCAO_KANBAN_COLUNAS_PADRAO,
  BALCAO_KANBAN_COLUMN_IDS,
  balcaoKanbanColunasAtivas,
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
    /** Filtro toolbar: monta query extra PENDENTE_EMISSAO | REJEITADAS. */
    colunaKanbanFiltro?: ColunaKanbanFiltroExtra | null
  }
) {
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const filtroExtra = options?.colunaKanbanFiltro ?? ''
  const colunasAtivas = useMemo(() => balcaoKanbanColunasAtivas(filtroExtra), [filtroExtra])

  const enabled = options?.enabled !== false
  const columnInfiniteOptions = {
    enabled,
    enviarFiltroFinalizacaoNaApi: options?.enviarFiltroFinalizacaoNaApi,
    refetchIntervalMs: options?.refetchIntervalMs,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  }

  const comNfeQuery = useVendasUnificadasKanbanColumnInfinite(
    'COM_NFE',
    params,
    columnInfiniteOptions
  )
  const finalizadasQuery = useVendasUnificadasKanbanColumnInfinite(
    'FINALIZADAS',
    params,
    columnInfiniteOptions
  )
  const pendenteQuery = useVendasUnificadasKanbanColumnInfinite(
    'PENDENTE_EMISSAO',
    params,
    {
      ...columnInfiniteOptions,
      enabled:
        enabled && (filtroExtra === 'PENDENTE_EMISSAO' || filtroExtra === 'TODAS'),
    }
  )
  const rejeitadasQuery = useVendasUnificadasKanbanColumnInfinite(
    'REJEITADAS',
    params,
    {
      ...columnInfiniteOptions,
      enabled: enabled && (filtroExtra === 'REJEITADAS' || filtroExtra === 'TODAS'),
    }
  )

  const queryByColumn: Record<ColunaKanbanBalcaoApi, typeof finalizadasQuery> = {
    COM_NFE: comNfeQuery,
    FINALIZADAS: finalizadasQuery,
    PENDENTE_EMISSAO: pendenteQuery,
    REJEITADAS: rejeitadasQuery,
  }

  const queryByColumnRef = useRef(queryByColumn)
  queryByColumnRef.current = queryByColumn

  const columnQueryKeys = useMemo(() => {
    const keys: Partial<Record<ColunaKanbanBalcaoApi, readonly unknown[]>> = {}
    for (const columnId of colunasAtivas) {
      const columnParams = buildVendasUnificadasParamsForKanbanColumn(columnId, params, {
        enviarFiltroFinalizacaoNaApi: options?.enviarFiltroFinalizacaoNaApi,
      })
      keys[columnId] = vendasUnificadasKanbanColumnQueryKey(columnId, columnParams, empresaId)
    }
    return keys
  }, [params, empresaId, options?.enviarFiltroFinalizacaoNaApi, colunasAtivas])

  const columnStates = useMemo((): Partial<
    Record<ColunaKanbanBalcaoApi, VendasUnificadasKanbanColumnState>
  > => {
    const map: Partial<Record<ColunaKanbanBalcaoApi, VendasUnificadasKanbanColumnState>> = {}

    for (const columnId of BALCAO_KANBAN_COLUMN_IDS) {
      const query = queryByColumn[columnId]
      const ativa = colunasAtivas.includes(columnId)
      if (!ativa && !query.data) continue

      const { totalCount } = flattenVendasUnificadasInfinite(query.data)
      const apiCount = query.data?.pages?.[0]?.count ?? totalCount

      map[columnId] = {
        data: query.data,
        isLoading: ativa ? query.isLoading : false,
        isFetchingNextPage: query.isFetchingNextPage,
        hasNextPage: query.hasNextPage ?? false,
        fetchNextPage: query.fetchNextPage,
        totalCount: apiCount,
      }
    }

    return map
  }, [
    colunasAtivas,
    comNfeQuery.data,
    comNfeQuery.isLoading,
    comNfeQuery.isFetchingNextPage,
    comNfeQuery.hasNextPage,
    finalizadasQuery.data,
    finalizadasQuery.isLoading,
    finalizadasQuery.isFetchingNextPage,
    finalizadasQuery.hasNextPage,
    pendenteQuery.data,
    pendenteQuery.isLoading,
    pendenteQuery.isFetchingNextPage,
    pendenteQuery.hasNextPage,
    rejeitadasQuery.data,
    rejeitadasQuery.isLoading,
    rejeitadasQuery.isFetchingNextPage,
    rejeitadasQuery.hasNextPage,
  ])

  const isLoading =
    BALCAO_KANBAN_COLUNAS_PADRAO.some(id => queryByColumn[id]?.isLoading) ||
    ((filtroExtra === 'PENDENTE_EMISSAO' || filtroExtra === 'TODAS') &&
      pendenteQuery.isLoading) ||
    ((filtroExtra === 'REJEITADAS' || filtroExtra === 'TODAS') && rejeitadasQuery.isLoading)

  const flattenAllItems = useCallback((): VendaUnificadaDTO[] => {
    const all: VendaUnificadaDTO[] = []
    for (const columnId of colunasAtivas) {
      const { items } = flattenVendasUnificadasInfinite(queryByColumn[columnId]?.data)
      all.push(...items)
    }
    return deduplicarItemsPorId(all)
  }, [
    colunasAtivas,
    comNfeQuery.data,
    finalizadasQuery.data,
    pendenteQuery.data,
    rejeitadasQuery.data,
  ])

  const refetch = useCallback(async () => {
    await Promise.all(
      colunasAtivas.map(async columnId => {
        const queryKey = columnQueryKeys[columnId]
        if (!queryKey) return
        await queryClient.resetQueries({ queryKey, exact: true })
      })
    )

    await Promise.all(
      colunasAtivas.map(columnId => queryByColumnRef.current[columnId]?.refetch())
    )
  }, [columnQueryKeys, queryClient, colunasAtivas])

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
      colunasAtivas,
    }),
    [
      columnStates,
      columnQueryKeys,
      isLoading,
      refetch,
      flattenAllItems,
      fetchNextPageForColumn,
      colunasAtivas,
    ]
  )
}
