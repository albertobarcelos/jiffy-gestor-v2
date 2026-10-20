import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { Taxa } from '@/src/domain/entities/Taxa'
import { listarTaxasPagina } from '@/src/infrastructure/api/taxasConfigApi'

type TaxasQueryParams = {
  q?: string
  limit?: number
  enabled?: boolean
  staleTime?: number
  refetchOnMount?: boolean | 'always'
}

/**
 * Lista taxas com paginação infinita (mesmo contrato de complementos: items + count).
 */
export function useTaxasInfinite(params: TaxasQueryParams = {}) {
  const {
    enabled = true,
    staleTime = 1000 * 60 * 5,
    refetchOnMount,
    ...queryParams
  } = params

  return useSecureTenantInfiniteQuery(
    ['taxas', 'infinite', queryParams],
    async ({ token }, pageParam) => {
      const limit = queryParams.limit || 10
      const response = await listarTaxasPagina(token, {
        limit,
        offset: pageParam,
        q: queryParams.q,
      })

      if (!response.ok) {
        throw new Error(response.error)
      }

      const data = response.data
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
      staleTime,
      ...(refetchOnMount !== undefined ? { refetchOnMount } : {}),
    }
  )
}
