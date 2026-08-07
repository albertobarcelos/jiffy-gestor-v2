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
  // Ordem preservada: prioridade do carrossel + invalida cache ao mudar sequência.
  const grupoIdsKey = useMemo(() => grupoIds.filter(Boolean).join(','), [grupoIds])
  const excludeKey = useMemo(
    () => [...new Set(excludeProdutoIds.filter(Boolean))].sort().join(','),
    [excludeProdutoIds]
  )

  return useQuery({
    queryKey: ['public-delivery-peca-tambem', slug, grupoIdsKey, excludeKey],
    queryFn: async ({ queryKey }): Promise<PecaTambemProdutoDTO[]> => {
      const [, slugKey, gruposKey, excludesKey] = queryKey as [
        string,
        string,
        string,
        string,
      ]
      const ids = String(gruposKey || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      if (!slugKey || ids.length === 0) return []
      const excludes = String(excludesKey || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const data = await fetchPecaTambemPublico(slugKey, {
        grupoIds: ids,
        excludeProdutoIds: excludes,
      })
      return data.produtos ?? []
    },
    enabled: Boolean(slug) && grupoIds.length > 0,
    staleTime: 30_000,
  })
}
