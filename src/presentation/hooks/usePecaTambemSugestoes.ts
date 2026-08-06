'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPecaTambemPublico } from '@/src/infrastructure/api/publicDeliveryApi'
import type { PecaTambemProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

export function usePecaTambemSugestoes(
  slug: string,
  grupoIds: string[],
  excludeProdutoIds: string[]
) {
  const grupoIdsKey = useMemo(() => [...grupoIds].sort().join(','), [grupoIds])
  const excludeKey = useMemo(
    () => [...excludeProdutoIds].sort().join(','),
    [excludeProdutoIds]
  )

  return useQuery({
    queryKey: ['public-delivery-peca-tambem', slug, grupoIdsKey, excludeKey],
    queryFn: async (): Promise<PecaTambemProdutoDTO[]> => {
      if (!slug || grupoIds.length === 0) return []
      const data = await fetchPecaTambemPublico(slug, {
        grupoIds,
        excludeProdutoIds,
      })
      return data.produtos ?? []
    },
    enabled: Boolean(slug) && grupoIds.length > 0,
    staleTime: 30_000,
  })
}
