import { useInfiniteQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
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
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()

  const { enabled = true, ...queryParams } = params

  return useInfiniteQuery({
    queryKey: ['taxas', 'infinite', queryParams, empresaId],
    queryFn: async ({
      pageParam = 0,
    }): Promise<{ taxas: Taxa[]; count: number; nextOffset: number | null }> => {
      if (!token) {
        throw new Error('Token não encontrado')
      }

      const limit = queryParams.limit || 10
      const searchParams = new URLSearchParams()
      if (queryParams.q) searchParams.append('q', queryParams.q)
      searchParams.append('limit', limit.toString())
      searchParams.append('offset', pageParam.toString())

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
    enabled: enabled && !!token,
    initialPageParam: 0,
    getNextPageParam: lastPage => lastPage.nextOffset,
    staleTime: 1000 * 60 * 5,
  })
}
