'use client'

import { useMemo } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
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
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'

export function vendasUnificadasKanbanColumnQueryKey(
  columnId: ColunaKanbanBalcaoApi,
  params: VendasUnificadasQueryParams,
  empresaId: string | null
) {
  return ['tenant', empresaId, 'vendas-unificadas', 'infinite', 'column', columnId, params] as const
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
  const columnParams = useMemo(
    () =>
      buildVendasUnificadasParamsForKanbanColumn(columnId, baseParams, {
        enviarFiltroFinalizacaoNaApi: options?.enviarFiltroFinalizacaoNaApi,
      }),
    [columnId, baseParams, options?.enviarFiltroFinalizacaoNaApi]
  )

  return useSecureTenantInfiniteQuery<VendasUnificadasResponse, number>(
    ['vendas-unificadas', 'infinite', 'column', columnId, columnParams],
    ({ token }, pageParam) =>
      fetchVendasUnificadasPagina(columnParams, pageParam, VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE, token),
    {
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => getNextOffsetVendasUnificadas(lastPage, allPages),
      enabled: options?.enabled !== false,
      retry: 2,
      refetchOnReconnect: true,
      refetchInterval: options?.refetchIntervalMs ?? false,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
      refetchIntervalInBackground: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }
  )
}

/**
 * Extrai o columnId de uma query key tenant-scoped do Kanban balcão.
 * Estrutura esperada: ['tenant', empresaId, 'vendas-unificadas', 'infinite', 'column', columnId, params]
 */
export function extrairColumnIdDeVendasUnificadasKanbanQueryKey(
  queryKey: readonly unknown[]
): ColunaKanbanId | null {
  if (queryKey.length < 7) return null
  if (queryKey[0] !== 'tenant') return null
  if (queryKey[4] !== 'column') return null
  const columnId = queryKey[5]
  if (typeof columnId !== 'string') return null
  return columnId as ColunaKanbanId
}
