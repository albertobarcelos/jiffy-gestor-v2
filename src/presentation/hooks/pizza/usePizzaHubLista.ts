'use client'

import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { buscarPizzaCategoriaViaBffUseCase } from '@/src/infrastructure/composition/pizzaUseCases'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { usePizzaCategorias } from '@/src/presentation/hooks/pizza/usePizza'
import { usePizzaHubCatalog } from '@/src/presentation/hooks/pizza/usePizzaHubCatalog'
import {
  fetchAllPizzaSabores,
  fetchTamanhosCountByCategorias,
  groupSaboresByCategoriaId,
  sortCategoriasPizzaByOrdem,
} from '@/src/presentation/hooks/pizza/pizzaReorderCatalogLoad'
import type { CategoriaPizza, SaborPizzaSummary } from '@/src/shared/types/pizza'

export type UsePizzaHubListaParams = {
  /** Busca enviada à API (`q`) — categorias (nome) e sabores (nome normalizado). */
  q?: string
  /** Filtro de status enviado à API (`ativo`). `null` = Todos. */
  ativo?: boolean | null
  limitCategorias?: number
}

/**
 * Lista do hub de pizzas: categorias + sabores só via endpoints (sem filtro local).
 * Com `q`, une categorias encontradas por nome com as das sabores encontrados.
 */
export function usePizzaHubLista(params: UsePizzaHubListaParams = {}) {
  const { q = '', ativo = null, limitCategorias = 50 } = params
  const qTrim = q.trim()
  const isSearching = Boolean(qTrim)

  const categoriasQuery = usePizzaCategorias({
    q: qTrim || undefined,
    ativo,
    limit: limitCategorias,
  })

  const categoriasFromApi = categoriasQuery.data?.items ?? []

  const saboresBuscaQuery = useSecureTenantQuery<SaborPizzaSummary[]>(
    ['pizza', 'hub', 'sabores-busca', qTrim, ativo],
    ({ token }) => fetchAllPizzaSabores(token, { q: qTrim, ativo }),
    {
      enabled: isSearching,
      staleTime: 1000 * 60 * 2,
    }
  )

  const saboresMatched = saboresBuscaQuery.data ?? []

  const knownCategoriaIds = useMemo(
    () => new Set(categoriasFromApi.map(c => c.id)),
    [categoriasFromApi]
  )

  const missingCategoriaIds = useMemo(() => {
    if (!isSearching) return [] as string[]
    const ids = new Set<string>()
    for (const sabor of saboresMatched) {
      if (sabor.categoriaPizzaId && !knownCategoriaIds.has(sabor.categoriaPizzaId)) {
        ids.add(sabor.categoriaPizzaId)
      }
    }
    return [...ids].sort()
  }, [isSearching, saboresMatched, knownCategoriaIds])

  const empresaId = useTenantEmpresaId()
  const token = useAuthStore(s => s.tenantAuth?.getAccessToken() ?? null)
  const missingEnabled = Boolean(token && empresaId && missingCategoriaIds.length > 0)

  const missingQueries = useQueries({
    queries: missingCategoriaIds.map(categoriaId => ({
      queryKey: buildTenantQueryKey(empresaId, ['pizza', 'categoria', categoriaId]),
      queryFn: () =>
        buscarPizzaCategoriaViaBffUseCase.execute({ token: token!, categoriaId }),
      enabled: missingEnabled,
      staleTime: 1000 * 60 * 2,
    })),
  })

  const missingCategorias = useMemo(() => {
    const list: CategoriaPizza[] = []
    for (const query of missingQueries) {
      if (query.data) list.push(query.data)
    }
    return list
  }, [missingQueries])

  const categorias = useMemo(() => {
    if (!isSearching) return categoriasFromApi
    const map = new Map<string, CategoriaPizza>()
    for (const cat of categoriasFromApi) map.set(cat.id, cat)
    for (const cat of missingCategorias) {
      // GET por id não recebe `ativo`; alinha ao mesmo filtro das listagens.
      if (ativo === true && !cat.ativo) continue
      if (ativo === false && cat.ativo) continue
      map.set(cat.id, cat)
    }
    return sortCategoriasPizzaByOrdem([...map.values()])
  }, [isSearching, categoriasFromApi, missingCategorias, ativo])

  const categoriaIds = useMemo(() => categorias.map(c => c.id), [categorias])
  const categoriaKey = useMemo(() => [...categoriaIds].sort().join('|'), [categoriaIds])

  const catalog = usePizzaHubCatalog(categoriaIds, {
    enabled: !isSearching && categoriaIds.length > 0,
    ativo,
  })

  const tamanhosBuscaQuery = useSecureTenantQuery<Record<string, number>>(
    ['pizza', 'hub', 'tamanhos-count', categoriaKey],
    ({ token: t }) => fetchTamanhosCountByCategorias(t, categoriaIds),
    {
      enabled: isSearching && categoriaIds.length > 0,
      staleTime: 1000 * 60 * 2,
    }
  )

  const saboresByCategoriaId = useMemo(() => {
    if (!isSearching) return catalog.saboresByCategoriaId
    const allowed = new Set(categorias.map(c => c.id))
    return groupSaboresByCategoriaId(
      saboresMatched.filter(s => allowed.has(s.categoriaPizzaId))
    )
  }, [isSearching, saboresMatched, catalog.saboresByCategoriaId, categorias])

  const tamanhosCountByCategoriaId = isSearching
    ? (tamanhosBuscaQuery.data ?? {})
    : catalog.tamanhosCountByCategoriaId

  const missingLoading =
    missingEnabled && missingQueries.some(query => query.isLoading || query.isFetching)

  const catalogLoading = isSearching
    ? saboresBuscaQuery.isLoading ||
      (saboresBuscaQuery.isFetching && !saboresBuscaQuery.data) ||
      missingLoading ||
      (tamanhosBuscaQuery.isLoading && categoriaIds.length > 0)
    : catalog.isLoading || (catalog.isFetching && !catalog.data)

  const isError =
    categoriasQuery.isError ||
    (isSearching && saboresBuscaQuery.isError) ||
    (!isSearching && catalog.isError)

  const refetch = async () => {
    await Promise.all([
      categoriasQuery.refetch(),
      isSearching ? saboresBuscaQuery.refetch() : catalog.refetch(),
    ])
  }

  return {
    categorias,
    saboresByCategoriaId,
    tamanhosCountByCategoriaId,
    isSearching,
    isLoading: categoriasQuery.isLoading,
    catalogLoading,
    isError,
    refetch,
  }
}
