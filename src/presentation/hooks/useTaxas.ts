import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { Taxa } from '@/src/domain/entities/Taxa'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'

type TaxasQueryParams = {
  q?: string
  limit?: number
  enabled?: boolean
}

type TaxasResponse = {
  items: Record<string, unknown>[]
  count: number
}

/**
 * Lista taxas com paginação infinita (mesmo contrato de complementos: items + count).
 */
export function useTaxasInfinite(params: TaxasQueryParams = {}) {
  const { enabled = true, ...queryParams } = params

  return useSecureTenantInfiniteQuery(
    ['taxas', 'infinite', queryParams],
    async ({ token }, pageParam) => {
      const limit = queryParams.limit || 10
      const searchParams = new URLSearchParams()
      if (queryParams.q) searchParams.append('q', queryParams.q)
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', String(pageParam))

      const response = await fetchGestorApi(`/api/taxas?${searchParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage =
          (typeof errorData.error === 'string' && errorData.error) ||
          (typeof errorData.message === 'string' && errorData.message) ||
          `Erro ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const data = (await response.json()) as TaxasResponse

      const taxas = (data.items || []).map(item => Taxa.fromJSON(item))
      const hasMore = taxas.length === limit
      const nextOffset = hasMore ? pageParam + taxas.length : null

      return {
        taxas,
        count: data.count || 0,
        nextOffset,
      }
    },
    {
      enabled,
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
    }
  )
}
