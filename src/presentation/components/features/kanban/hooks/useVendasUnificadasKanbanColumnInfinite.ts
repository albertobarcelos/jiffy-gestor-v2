'use client'

import { useMemo } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type { ColunaKanbanId } from '../types'
import {
  buildVendasUnificadasParamsForKanbanColumn,
  type ColunaKanbanBalcaoApi,
} from '../utils/kanbanBalcaoColumnConfig'
import {
  fetchVendasUnificadasPagina,
  getNextOffsetVendasUnificadas,
  VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE,
  type VendasUnificadasInfiniteOptions,
  type VendasUnificadasQueryParams,
  type VendasUnificadasResponse,
} from './useVendasUnificadas'

export function vendasUnificadasKanbanColumnQueryKey(
  columnId: ColunaKanbanBalcaoApi,
  params: VendasUnificadasQueryParams,
  empresaId: string | null
) {
  return ['vendas-unificadas', 'infinite', empresaId, 'column', columnId, params] as const
}

/**
 * Infinite query de uma coluna fiscal do Kanban balcão (`colunaKanban` + offset/limit).
 */
export function useVendasUnificadasKanbanColumnInfinite(
  columnId: ColunaKanbanBalcaoApi,
  baseParams: VendasUnificadasQueryParams,
  options?: VendasUnificadasInfiniteOptions & {
    enviarFiltroFinalizacaoNaApi?: boolean
  }
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()

  const columnParams = useMemo(
    () =>
      buildVendasUnificadasParamsForKanbanColumn(columnId, baseParams, {
        enviarFiltroFinalizacaoNaApi: options?.enviarFiltroFinalizacaoNaApi,
      }),
    [columnId, baseParams, options?.enviarFiltroFinalizacaoNaApi]
  )

  const queryKey = vendasUnificadasKanbanColumnQueryKey(columnId, columnParams, empresaId)
  const enabled = options?.enabled !== false && !!token

  return useInfiniteQuery<
    VendasUnificadasResponse,
    Error,
    InfiniteData<VendasUnificadasResponse>,
    readonly unknown[],
    number
  >({
    queryKey,
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetchVendasUnificadasPagina(
        columnParams,
        pageParam,
        VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE,
        token!,
        signal
      ),
    getNextPageParam: (lastPage, allPages) => getNextOffsetVendasUnificadas(lastPage, allPages),
    enabled,
    retry: 2,
    refetchOnReconnect: true,
    refetchInterval: options?.refetchIntervalMs ?? false,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    refetchIntervalInBackground: false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}

export function extrairColumnIdDeVendasUnificadasKanbanQueryKey(
  queryKey: readonly unknown[]
): ColunaKanbanId | null {
  if (queryKey.length < 6) return null
  const marker = queryKey[4]
  if (marker !== 'column') return null
  const columnId = queryKey[5]
  if (typeof columnId !== 'string') return null
  return columnId as ColunaKanbanId
}
