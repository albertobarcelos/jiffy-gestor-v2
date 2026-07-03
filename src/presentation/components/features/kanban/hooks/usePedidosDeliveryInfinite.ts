'use client'

import {
  keepPreviousData,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query'
import type { FiltrosKanbanParaPedidosDelivery } from '@/src/application/dto/api/pedidoDeliveryListQuery'
import {
  montarPedidosDeliveryQueryParams,
  serializarPedidosDeliveryQueryParams,
} from '@/src/application/dto/api/pedidoDeliveryListQuery'
import { PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE } from '@/src/application/dto/api/pedidoDeliveryListApi'
import {
  mapPedidosDeliveryListResponseParaVendaUnificadaDTO,
  normalizarPedidosDeliveryListResponse,
} from '@/src/application/mappers/PedidoDeliveryListMapper'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { preservarObservacoesKanbanCacheNosItems } from '../utils/kanbanVendaCacheUpdate'
import {
  flattenVendasUnificadasInfinite,
  getNextOffsetVendasUnificadas,
  type VendaUnificadaDTO,
  type VendasUnificadasQueryParams,
  type VendasUnificadasResponse,
} from './useVendasUnificadas'

/** Params de listagem (filtros Kanban) — paginação via `offset`/`limit` internos. */
export type PedidosDeliveryInfiniteParams = Omit<
  FiltrosKanbanParaPedidosDelivery,
  'offset' | 'limit'
>

export interface PedidosDeliveryInfinitePage {
  items: VendaUnificadaDTO[]
  count: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
}

export interface PedidosDeliveryInfiniteOptions {
  refetchIntervalMs?: number | false
  refetchOnWindowFocus?: boolean
  enabled?: boolean
  /** Envia `dataCriacaoInicial/Final` na API quando o período está ativo (colunas operacionais). */
  enviarFiltroCriacaoNaApi?: boolean
  /** Envia `dataFinalizacaoInicial/Final` na API quando o período está ativo (colunas fiscais). */
  enviarFiltroFinalizacaoNaApi?: boolean
}

/** Converte filtros compartilhados do Kanban (unificado) para listagem delivery Jiffy. */
export function vendasUnificadasQueryParamsParaPedidosDelivery(
  params: VendasUnificadasQueryParams
): PedidosDeliveryInfiniteParams {
  const origem = params.origem
  const origemFiltroKanban =
    origem === 'PDV' || origem === 'GESTOR' || origem === 'DELIVERY' ? origem : undefined

  const tipoEntrega =
    params.tipoEntrega === 'entrega' || params.tipoEntrega === 'retirada'
      ? params.tipoEntrega
      : undefined

  return {
    q: params.q,
    origemFiltroKanban,
    tipoEntrega,
    dataCriacaoInicial: params.dataCriacaoInicial ?? params.periodoInicial,
    dataCriacaoFinal: params.dataCriacaoFinal ?? params.periodoFinal,
    dataFinalizacaoInicio: params.dataFinalizacaoInicio,
    dataFinalizacaoFim: params.dataFinalizacaoFim,
  }
}

export async function fetchPedidosDeliveryPagina(
  params: PedidosDeliveryInfiniteParams,
  offset: number,
  limit: number,
  token: string,
  signal?: AbortSignal,
  queryClient?: QueryClient
): Promise<PedidosDeliveryInfinitePage> {
  const queryParams = montarPedidosDeliveryQueryParams({
    ...params,
    offset,
    limit,
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
    const errorData = await response.json().catch(() => ({}))
    const errorMessage =
      errorData.error || errorData.message || `Erro ${response.status}: ${response.statusText}`
    throw new Error(errorMessage)
  }

  const data = await response.json()
  const normalizado = normalizarPedidosDeliveryListResponse(data)
  const mapeado = mapPedidosDeliveryListResponseParaVendaUnificadaDTO(normalizado)
  const items =
    queryClient != null
      ? preservarObservacoesKanbanCacheNosItems(queryClient, mapeado.items)
      : mapeado.items

  return {
    items,
    count: mapeado.count,
    page: mapeado.page,
    limit: mapeado.limit,
    totalPages: mapeado.totalPages,
    hasNext: mapeado.hasNext,
    hasPrevious: mapeado.hasPrevious,
  }
}

export function getNextOffsetPedidosDelivery(
  lastPage: PedidosDeliveryInfinitePage,
  allPages: PedidosDeliveryInfinitePage[]
): number | undefined {
  return getNextOffsetVendasUnificadas(
    lastPage as VendasUnificadasResponse,
    allPages as VendasUnificadasResponse[]
  )
}

/** Base key (sem prefixo tenant) — useSecureTenantInfiniteQuery adiciona `['tenant', empresaId, ...]`. */
export function pedidosDeliveryInfiniteBaseKey(params: PedidosDeliveryInfiniteParams) {
  return ['delivery', 'pedidos', 'infinite', params] as const
}

export function pedidosDeliveryInfiniteQueryKey(
  params: PedidosDeliveryInfiniteParams,
  empresaId: string | null
) {
  return buildTenantQueryKey(empresaId, pedidosDeliveryInfiniteBaseKey(params))
}

/**
 * Listagem paginada de pedidos delivery (módulo Jiffy) para o Kanban operacional.
 * Retorna `VendaUnificadaDTO` — mesmo card/colunas do unificado, sem enrich N+1.
 */
export function usePedidosDeliveryInfinite(
  params: PedidosDeliveryInfiniteParams,
  options?: PedidosDeliveryInfiniteOptions
) {
  const queryClient = useQueryClient()

  return useSecureTenantInfiniteQuery(
    pedidosDeliveryInfiniteBaseKey(params),
    ({ token }, pageParam) =>
      fetchPedidosDeliveryPagina(
        params,
        pageParam,
        PEDIDOS_DELIVERY_KANBAN_PAGE_SIZE,
        token,
        undefined,
        queryClient
      ),
    {
      enabled: options?.enabled !== false,
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => getNextOffsetPedidosDelivery(lastPage, allPages),
      refetchOnReconnect: true,
      refetchInterval: options?.refetchIntervalMs ?? false,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
      refetchIntervalInBackground: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }
  )
}

/** Achata páginas do infinite query e deduplica por id. */
export function flattenPedidosDeliveryInfinite(
  data: InfiniteData<PedidosDeliveryInfinitePage> | undefined
): { items: VendaUnificadaDTO[]; totalCount: number } {
  return flattenVendasUnificadasInfinite(
    data as InfiniteData<VendasUnificadasResponse> | undefined
  )
}
