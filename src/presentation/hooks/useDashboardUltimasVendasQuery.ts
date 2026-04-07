import { useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

export type DashboardUltimasVendasResponse = {
  items: Array<Record<string, unknown>>
  userNames: Record<string, string>
  hasMore: boolean
}

type Params = {
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  /** Itens por página (máx. 100 na API). */
  limit?: number
  enabled?: boolean
}

async function fetchUltimasVendasPage(params: {
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  limit: number
  offset: number
}): Promise<DashboardUltimasVendasResponse> {
  const search = new URLSearchParams()
  search.append('limit', String(params.limit))
  search.append('offset', String(params.offset))
  if (params.periodoInicial) search.append('periodoInicial', params.periodoInicial.toISOString())
  if (params.periodoFinal) search.append('periodoFinal', params.periodoFinal.toISOString())

  const response = await fetch(`/api/dashboard/ultimas-vendas?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar últimas vendas'
    throw new Error(msg)
  }

  const items = Array.isArray(data.items) ? data.items : []
  const userNames =
    data.userNames && typeof data.userNames === 'object' && data.userNames !== null
      ? (data.userNames as Record<string, string>)
      : {}
  const hasMore = typeof data.hasMore === 'boolean' ? data.hasMore : items.length === params.limit

  return { items, userNames, hasMore }
}

const PAGE_SIZE = 20

/**
 * Últimas vendas do período com paginação infinita (scroll).
 */
export function useDashboardUltimasVendasQuery({
  periodoInicial,
  periodoFinal,
  limit = PAGE_SIZE,
  enabled = true,
}: Params) {
  const infinite = useInfiniteQuery({
    queryKey: [
      'dashboard',
      'ultimas-vendas',
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
      limit,
    ],
    queryFn: ({ pageParam }) =>
      fetchUltimasVendasPage({
        periodoInicial,
        periodoFinal,
        limit,
        offset: pageParam as number,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.reduce((sum, p) => sum + p.items.length, 0)
    },
    enabled,
    staleTime: 30_000,
  })

  const data = useMemo(() => {
    if (!infinite.data?.pages?.length) {
      return { items: [] as Array<Record<string, unknown>>, userNames: {} as Record<string, string> }
    }
    const items = infinite.data.pages.flatMap((p) => p.items)
    const userNames = Object.assign({}, ...infinite.data.pages.map((p) => p.userNames ?? {}))
    return { items, userNames }
  }, [infinite.data])

  return {
    data,
    isLoading: infinite.isPending,
    isFetchingNextPage: infinite.isFetchingNextPage,
    hasNextPage: infinite.hasNextPage ?? false,
    fetchNextPage: infinite.fetchNextPage,
    error: infinite.error,
    isError: infinite.isError,
    refetch: infinite.refetch,
  }
}
