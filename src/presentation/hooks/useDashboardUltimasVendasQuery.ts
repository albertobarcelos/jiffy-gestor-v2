import { useQuery } from '@tanstack/react-query'

export type DashboardUltimasVendasResponse = {
  items: Array<Record<string, unknown>>
  userNames: Record<string, string>
}

type Params = {
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  limit?: number
  enabled?: boolean
}

async function fetchUltimasVendas(params: Params): Promise<DashboardUltimasVendasResponse> {
  const search = new URLSearchParams()
  const limit = typeof params.limit === 'number' ? params.limit : 100
  search.append('limit', String(limit))
  if (params.periodoInicial) search.append('periodoInicial', params.periodoInicial.toISOString())
  if (params.periodoFinal) search.append('periodoFinal', params.periodoFinal.toISOString())

  const response = await fetch(`/api/dashboard/ultimas-vendas?${search.toString()}`)
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>
  if (!response.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Erro ao carregar últimas vendas'
    throw new Error(msg)
  }

  return data as unknown as DashboardUltimasVendasResponse
}

export function useDashboardUltimasVendasQuery({ periodoInicial, periodoFinal, limit = 100, enabled = true }: Params) {
  return useQuery({
    queryKey: [
      'dashboard',
      'ultimas-vendas',
      periodoInicial ? periodoInicial.toISOString() : null,
      periodoFinal ? periodoFinal.toISOString() : null,
      limit,
    ],
    queryFn: () => fetchUltimasVendas({ periodoInicial, periodoFinal, limit, enabled }),
    enabled,
    staleTime: 30_000,
  })
}

