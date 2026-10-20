import {
  keepPreviousData,
  type InfiniteData,
} from '@tanstack/react-query'
import { fetchGestorApi } from '@/src/infrastructure/api/fetchGestorApi'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import {
  mapItemJsonParaVendaUnificadaDTO,
  montarSearchParamsVendasUnificadas,
  VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE,
  type VendaUnificadaDTO,
  type VendasUnificadasInfiniteOptions,
  type VendasUnificadasQueryParams,
  type VendasUnificadasResponse,
} from '@/src/application/dto/VendaUnificadaDTO'

export {
  mapItemJsonParaVendaUnificadaDTO,
  mapVendaPdvJsonParaVendaUnificadaDTO,
  montarSearchParamsVendasUnificadas,
  resolveModeloParaEmitirNota,
  VendaUnificadaDTO,
  VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE,
  type CobrancaKanbanDeliveryResumo,
  type EntregadorKanbanDeliveryResumo,
  type EtapaKanbanBalcao,
  type VendasUnificadasInfiniteOptions,
  type VendasUnificadasQueryParams,
  type VendasUnificadasResponse,
} from '@/src/application/dto/VendaUnificadaDTO'

/** Uma página da API (itens já mapeados para DTO). */
export async function fetchVendasUnificadasPagina(
  params: VendasUnificadasQueryParams,
  offset: number,
  limit: number,
  token: string,
  signal?: AbortSignal
): Promise<VendasUnificadasResponse> {
  const searchParams = montarSearchParamsVendasUnificadas(params, offset, limit)

  const response = await fetchGestorApi(`/api/vendas/unificado?${searchParams.toString()}`, {
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
  const pagina =
    data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? (data.data as Record<string, unknown>)
      : (data as Record<string, unknown>)

  const rawItems = (pagina.items || []) as Record<string, unknown>[]
  const items = rawItems.map(mapItemJsonParaVendaUnificadaDTO)

  return {
    items,
    count: typeof pagina.count === 'number' ? pagina.count : items.length,
    page: (pagina.page as number) ?? 1,
    limit: (pagina.limit as number) ?? limit,
    totalPages: (pagina.totalPages as number) ?? 1,
    hasNext: (pagina.hasNext as boolean) ?? false,
    hasPrevious: (pagina.hasPrevious as boolean) ?? false,
  }
}

function deduplicarPaginasVendas(
  pages: VendasUnificadasResponse[]
): { items: VendaUnificadaDTO[]; totalCount: number } {
  const ids = new Set<string>()
  const items: VendaUnificadaDTO[] = []
  for (const page of pages) {
    for (const item of page.items) {
      if (!ids.has(item.id)) {
        ids.add(item.id)
        items.push(item)
      }
    }
  }
  const totalCount = Math.max(
    0,
    ...pages.map(p => (typeof p.count === 'number' ? p.count : 0)),
    items.length
  )
  return { items, totalCount }
}

export function getNextOffsetVendasUnificadas(
  lastPage: VendasUnificadasResponse,
  allPages: VendasUnificadasResponse[]
): number | undefined {
  const { items: carregadosItens } = deduplicarPaginasVendas(allPages)
  const carregados = carregadosItens.length
  const total = typeof lastPage.count === 'number' ? lastPage.count : 0

  if (total > 0 && carregados >= total) return undefined

  if (lastPage.items.length === 0) return undefined

  const idsAnteriores = new Set<string>()
  for (let i = 0; i < allPages.length - 1; i++) {
    for (const item of allPages[i].items) idsAnteriores.add(item.id)
  }
  const novosNaUltima =
    lastPage.items.length > 0
      ? lastPage.items.filter(item => !idsAnteriores.has(item.id))
      : []
  if (lastPage.items.length > 0 && novosNaUltima.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn(
        '[useVendasUnificadasInfinite] Página duplicada (offset ignorado na API?). Parando paginação.'
      )
    }
    return undefined
  }

  if (!lastPage.hasNext && lastPage.items.length < VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE) {
    return undefined
  }

  return carregados
}

/**
 * Vendas unificadas com paginação infinita (Kanban).
 * Primeira página (50) exibe rápido; demais páginas via scroll na coluna.
 */
export function useVendasUnificadasInfinite(
  params: VendasUnificadasQueryParams,
  options?: VendasUnificadasInfiniteOptions
) {
  return useSecureTenantInfiniteQuery<VendasUnificadasResponse, number>(
    ['vendas-unificadas', 'infinite', params],
    ({ token }, pageParam) =>
      fetchVendasUnificadasPagina(params, pageParam, VENDAS_UNIFICADAS_KANBAN_PAGE_SIZE, token),
    {
      placeholderData: keepPreviousData,
      initialPageParam: 0,
      getNextPageParam: (lastPage, allPages) => getNextOffsetVendasUnificadas(lastPage, allPages),
      enabled: options?.enabled !== false,
      refetchOnReconnect: true,
      refetchInterval: options?.refetchIntervalMs ?? false,
      refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
      refetchIntervalInBackground: false,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    }
  )
}

export function vendasUnificadasInfiniteQueryKey(
  params: VendasUnificadasQueryParams,
  empresaId: string | null
) {
  return ['tenant', empresaId, 'vendas-unificadas', 'infinite', params] as const
}

/** Achata páginas do infinite query e deduplica por id. */
export function flattenVendasUnificadasInfinite(
  data: InfiniteData<VendasUnificadasResponse> | undefined
): { items: VendaUnificadaDTO[]; totalCount: number } {
  if (!data?.pages?.length) return { items: [], totalCount: 0 }
  return deduplicarPaginasVendas(data.pages)
}

