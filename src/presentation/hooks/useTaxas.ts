import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { Taxa } from '@/src/domain/entities/Taxa'

type TaxasQueryParams = {
  q?: string
  limit?: number
}

type TaxasResponse = {
  items: Record<string, unknown>[]
  count: number
}

/**
 * Lista taxas com paginação infinita (mesmo contrato de complementos: items + count).
 */
export function useTaxasInfinite(params: TaxasQueryParams = {}) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()

  return useInfiniteQuery({
    queryKey: ['taxas', 'infinite', params],
    queryFn: async ({
      pageParam = 0,
    }): Promise<{ taxas: Taxa[]; count: number; nextOffset: number | null }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const limit = params.limit || 10
      const searchParams = new URLSearchParams()
      if (params.q) searchParams.append('q', params.q)
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', pageParam.toString())

      const response = await fetch(`/api/taxas?${searchParams.toString()}`, {
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
    enabled: !!token,
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextOffset,
    staleTime: 1000 * 60 * 5,
  })
}
