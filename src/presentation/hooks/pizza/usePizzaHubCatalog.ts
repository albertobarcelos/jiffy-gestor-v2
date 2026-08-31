'use client'

import { useMemo } from 'react'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import {
  fetchAllPizzaSabores,
  fetchTamanhosCountByCategorias,
  groupSaboresByCategoriaId,
} from '@/src/presentation/components/features/pizza/reorder/pizzaReorderCatalogLoad'
import type { SaborPizzaSummary } from '@/src/shared/types/pizza'

export type PizzaHubCatalogData = {
  saboresByCategoriaId: Record<string, SaborPizzaSummary[]>
  tamanhosCountByCategoriaId: Record<string, number>
}

export function usePizzaHubCatalog(categoriaIds: readonly string[], enabled = true) {
  const categoriaKey = useMemo(
    () => [...categoriaIds].sort().join('|'),
    [categoriaIds]
  )

  const query = useSecureTenantQuery<PizzaHubCatalogData>(
    ['pizza', 'hub', 'catalog', categoriaKey],
    async ({ token }) => {
      const ids = categoriaKey ? categoriaKey.split('|') : []
      const [sabores, tamanhosCountByCategoriaId] = await Promise.all([
        fetchAllPizzaSabores(token),
        ids.length > 0 ? fetchTamanhosCountByCategorias(token, ids) : Promise.resolve({}),
      ])

      return {
        saboresByCategoriaId: groupSaboresByCategoriaId(sabores),
        tamanhosCountByCategoriaId,
      }
    },
    {
      enabled: enabled && categoriaIds.length > 0,
      staleTime: 1000 * 60 * 2,
    }
  )

  const saboresByCategoriaId = query.data?.saboresByCategoriaId ?? {}
  const tamanhosCountByCategoriaId = query.data?.tamanhosCountByCategoriaId ?? {}

  return {
    ...query,
    saboresByCategoriaId,
    tamanhosCountByCategoriaId,
  }
}
