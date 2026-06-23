'use client'

import { useMemo } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { KANBAN_DELIVERY_COLUMN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type { ColunaKanbanId } from '../types'
import { buildPedidosDeliveryParamsForKanbanColumn } from '../utils/kanbanDeliveryColumnConfig'
import {
  fetchPedidosDeliveryPagina,
  getNextOffsetPedidosDelivery,
  type PedidosDeliveryInfiniteOptions,
  type PedidosDeliveryInfinitePage,
  type PedidosDeliveryInfiniteParams,
} from './usePedidosDeliveryInfinite'

export function pedidosDeliveryKanbanColumnQueryKey(
  columnId: ColunaKanbanId,
  params: PedidosDeliveryInfiniteParams,
  empresaId: string | null
) {
  return [
    'delivery',
    'pedidos',
    'infinite',
    empresaId,
    'column',
    columnId,
    params,
  ] as const
}

/**
 * Infinite query de uma coluna do Kanban delivery (status + offset/limit independentes).
 */
export function usePedidosDeliveryKanbanColumnInfinite(
  columnId: ColunaKanbanId,
  baseParams: PedidosDeliveryInfiniteParams,
  options?: PedidosDeliveryInfiniteOptions
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()

  const columnParams = useMemo(
    () =>
      buildPedidosDeliveryParamsForKanbanColumn(columnId, baseParams, {
        enviarFiltroCriacaoNaApi: options?.enviarFiltroCriacaoNaApi,
      }),
    [columnId, baseParams, options?.enviarFiltroCriacaoNaApi]
  )

  const queryKey = pedidosDeliveryKanbanColumnQueryKey(columnId, columnParams, empresaId)
  const enabled = options?.enabled !== false && !!token

  return useInfiniteQuery<
    PedidosDeliveryInfinitePage,
    Error,
    InfiniteData<PedidosDeliveryInfinitePage>,
    readonly unknown[],
    number
  >({
    queryKey,
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetchPedidosDeliveryPagina(
        columnParams,
        pageParam,
        KANBAN_DELIVERY_COLUMN_PAGE_SIZE,
        token!,
        signal,
        queryClient
      ),
    getNextPageParam: (lastPage, allPages) => getNextOffsetPedidosDelivery(lastPage, allPages),
    enabled,
    retry: 2,
    refetchOnReconnect: true,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  })
}
