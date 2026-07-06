'use client'

import { useMemo } from 'react'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import { KANBAN_DELIVERY_COLUMN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type { ColunaKanbanId } from '../types'
import { buildPedidosDeliveryParamsForKanbanColumn } from '../utils/kanbanDeliveryColumnConfig'
import {
  fetchPedidosDeliveryPagina,
  getNextOffsetPedidosDelivery,
  type PedidosDeliveryInfiniteOptions,
  type PedidosDeliveryInfiniteParams,
} from './usePedidosDeliveryInfinite'

/** Base key sem prefixo tenant. */
export function pedidosDeliveryKanbanColumnBaseKey(
  columnId: ColunaKanbanId,
  params: PedidosDeliveryInfiniteParams
) {
  return ['delivery', 'pedidos', 'infinite', 'column', columnId, params] as const
}

export function pedidosDeliveryKanbanColumnQueryKey(
  columnId: ColunaKanbanId,
  params: PedidosDeliveryInfiniteParams,
  empresaId: string | null
) {
  return buildTenantQueryKey(empresaId, pedidosDeliveryKanbanColumnBaseKey(columnId, params))
}

/**
 * Infinite query de uma coluna do Kanban delivery (status + offset/limit independentes).
 */
export function usePedidosDeliveryKanbanColumnInfinite(
  columnId: ColunaKanbanId,
  baseParams: PedidosDeliveryInfiniteParams,
  options?: PedidosDeliveryInfiniteOptions
) {
  const queryClient = useQueryClient()

  const columnParams = useMemo(
    () =>
      buildPedidosDeliveryParamsForKanbanColumn(columnId, baseParams, {
        enviarFiltroCriacaoNaApi: options?.enviarFiltroCriacaoNaApi,
        enviarFiltroFinalizacaoNaApi: options?.enviarFiltroFinalizacaoNaApi,
      }),
    [
      columnId,
      baseParams,
      options?.enviarFiltroCriacaoNaApi,
      options?.enviarFiltroFinalizacaoNaApi,
    ]
  )

  return useSecureTenantInfiniteQuery(
    pedidosDeliveryKanbanColumnBaseKey(columnId, columnParams),
    ({ token }, pageParam) =>
      fetchPedidosDeliveryPagina(
        columnParams,
        pageParam,
        KANBAN_DELIVERY_COLUMN_PAGE_SIZE,
        token,
        undefined,
        queryClient
      ),
    {
      enabled: options?.enabled !== false,
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => getNextOffsetPedidosDelivery(lastPage, allPages),
      retry: 2,
      refetchOnReconnect: true,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      gcTime: 5 * 60_000,
    }
  )
}
