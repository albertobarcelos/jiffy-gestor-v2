'use client'

import { keepPreviousData, useQueries } from '@tanstack/react-query'
import type { FiltrosKanbanParaPedidosDelivery } from '@/src/application/dto/api/pedidoDeliveryListQuery'
import { montarPedidosDeliveryContagemQueryString } from '@/src/application/dto/api/pedidoDeliveryListQuery'
import {
  PEDIDOS_DELIVERY_CONTAGEM_POR_STATUS_VAZIA,
  type PedidosDeliveryContagemPorStatusResponse,
} from '@/src/application/dto/api/pedidoDeliveryListApi'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  buildPedidosDeliveryParamsForKanbanColumn,
  paramsOperacionaisDeliveryKanbanColumn,
} from '../utils/kanbanDeliveryColumnConfig'
import type { PedidosDeliveryInfiniteParams } from './usePedidosDeliveryInfinite'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

export type PedidosDeliveryContagemVariant = 'operacional' | 'finalizados'

export function pedidosDeliveryContagemQueryKey(
  variant: PedidosDeliveryContagemVariant,
  filtros: FiltrosKanbanParaPedidosDelivery,
  empresaId: string | null
) {
  return ['delivery', 'pedidos', 'contagem-por-status', empresaId, variant, filtros] as const
}

function montarFiltrosContagemOperacional(
  params: PedidosDeliveryInfiniteParams,
  enviarFiltroCriacaoNaApi?: boolean
): FiltrosKanbanParaPedidosDelivery {
  const operacional = paramsOperacionaisDeliveryKanbanColumn(params, {
    enviarFiltroCriacaoNaApi,
  })
  return { ...operacional, cancelado: false }
}

function montarFiltrosContagemFinalizados(
  params: PedidosDeliveryInfiniteParams,
  enviarFiltroFinalizacaoNaApi?: boolean
): FiltrosKanbanParaPedidosDelivery {
  const finalizados = buildPedidosDeliveryParamsForKanbanColumn('FINALIZADAS', params, {
    enviarFiltroFinalizacaoNaApi,
  })
  const { statusDelivery: _status, ...rest } = finalizados
  return { ...rest, cancelado: false }
}

function normalizarContagemPorStatusResponse(
  raw: unknown
): PedidosDeliveryContagemPorStatusResponse {
  if (!raw || typeof raw !== 'object') return PEDIDOS_DELIVERY_CONTAGEM_POR_STATUS_VAZIA
  const data = raw as Record<string, unknown>
  const num = (key: string) => {
    const value = Number(data[key])
    return Number.isFinite(value) ? value : 0
  }
  const contagem: PedidosDeliveryContagemPorStatusResponse = {
    PENDENTE: num('PENDENTE'),
    EM_PREPARO: num('EM_PREPARO'),
    PRONTO: num('PRONTO'),
    EM_ROTA: num('EM_ROTA'),
    FINALIZADO: num('FINALIZADO'),
    CANCELADO: num('CANCELADO'),
    total: num('total'),
  }
  if (contagem.total === 0) {
    contagem.total =
      contagem.PENDENTE +
      contagem.EM_PREPARO +
      contagem.PRONTO +
      contagem.EM_ROTA +
      contagem.FINALIZADO +
      contagem.CANCELADO
  }
  return contagem
}

export async function fetchPedidosDeliveryContagemPorStatus(
  filtros: FiltrosKanbanParaPedidosDelivery,
  token: string,
  signal?: AbortSignal
): Promise<PedidosDeliveryContagemPorStatusResponse> {
  const qs = montarPedidosDeliveryContagemQueryString(filtros)
  const response = await fetchGestorApi(
    `/api/delivery/pedidos/contagem-por-status${qs ? `?${qs}` : ''}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal,
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const errorMessage =
      errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
    throw new Error(errorMessage)
  }

  const data = await response.json()
  return normalizarContagemPorStatusResponse(data)
}

export interface UsePedidosDeliveryContagemPorStatusOptions {
  enabled?: boolean
  enviarFiltroCriacaoNaApi?: boolean
  enviarFiltroFinalizacaoNaApi?: boolean
}

/**
 * Contagem agregada por status (2 chamadas: operacional e finalizados com filtros distintos).
 */
export function usePedidosDeliveryContagemPorStatus(
  params: PedidosDeliveryInfiniteParams,
  options?: UsePedidosDeliveryContagemPorStatusOptions
) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const enabled = options?.enabled !== false && !!token

  const filtrosOperacional = montarFiltrosContagemOperacional(
    params,
    options?.enviarFiltroCriacaoNaApi
  )
  const filtrosFinalizados = montarFiltrosContagemFinalizados(
    params,
    options?.enviarFiltroFinalizacaoNaApi
  )

  const results = useQueries({
    queries: [
      {
        queryKey: pedidosDeliveryContagemQueryKey('operacional', filtrosOperacional, empresaId),
        queryFn: ({ signal }) =>
          fetchPedidosDeliveryContagemPorStatus(filtrosOperacional, token!, signal),
        enabled,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      },
      {
        queryKey: pedidosDeliveryContagemQueryKey('finalizados', filtrosFinalizados, empresaId),
        queryFn: ({ signal }) =>
          fetchPedidosDeliveryContagemPorStatus(filtrosFinalizados, token!, signal),
        enabled,
        placeholderData: keepPreviousData,
        staleTime: 30_000,
        gcTime: 5 * 60_000,
      },
    ],
  })

  const [operacionalQuery, finalizadosQuery] = results

  const refetch = async () => {
    await Promise.all(results.map(r => r.refetch()))
  }

  return {
    operacional: operacionalQuery.data,
    finalizados: finalizadosQuery.data,
    finalizadoTotal: finalizadosQuery.data?.FINALIZADO ?? 0,
    isLoading: operacionalQuery.isLoading || finalizadosQuery.isLoading,
    isFetching: operacionalQuery.isFetching || finalizadosQuery.isFetching,
    refetch,
  }
}
