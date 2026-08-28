'use client'

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import {
  calcularPrecoMinimoSabores,
  contarTamanhosComPreco,
} from '@/src/presentation/utils/pizza/pizzaMenuHelpers'
import type { SaborPizza } from '@/src/shared/types/pizza'

export type PizzaSaborPrecoResumo = {
  precoMinimo: number | null
  tamanhosComPreco: number
}

async function fetchSaborPizza(token: string, saborId: string): Promise<SaborPizza> {
  const response = await fetchGestorApi(`/api/cardapio/pizza/sabores/${saborId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Erro ao carregar preços do sabor')
  const data = await response.json()
  return (data.data ?? data) as SaborPizza
}

/**
 * Carrega preço mínimo por sabor (matriz sabor × tamanho) para exibição no MenuEditor.
 */
export function usePizzaSaboresPrecosResumo(saborIds: string[]) {
  const empresaId = useTenantEmpresaId()
  const token = useAuthStore(s => s.tenantAuth?.getAccessToken() ?? null)

  const ids = useMemo(
    () => [...new Set(saborIds.filter(Boolean))].sort(),
    [saborIds]
  )

  const enabled = Boolean(token && empresaId && ids.length > 0)

  const queries = useQueries({
    queries: ids.map(saborId => ({
      queryKey: buildTenantQueryKey(empresaId, ['pizza', 'sabor', 'preco-resumo', saborId]),
      queryFn: () => fetchSaborPizza(token!, saborId),
      enabled,
      staleTime: 1000 * 60 * 2,
    })),
  })

  const precosPorSaborId = useMemo(() => {
    const map = new Map<string, PizzaSaborPrecoResumo>()
    ids.forEach((saborId, index) => {
      const data = queries[index]?.data
      if (!data) return
      map.set(saborId, {
        precoMinimo: calcularPrecoMinimoSabores(data.precosTamanho),
        tamanhosComPreco: contarTamanhosComPreco(data.precosTamanho),
      })
    })
    return map
  }, [ids, queries])

  const isLoading = enabled && queries.some(q => q.isLoading)

  return { precosPorSaborId, isLoading }
}
