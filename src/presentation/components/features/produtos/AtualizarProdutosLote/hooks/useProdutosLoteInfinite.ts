'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { PRODUTOS_LOTE_PAGE_SIZE } from '../constants'
import type { ProdutosLoteFilterState } from '../types'
import { fetchProdutosLotePage } from '../utils/produtosLoteApi'
import { findScrollableAncestor } from '../utils/produtosLoteUi'

export type ProdutosLotePage = { list: Produto[]; count: number | null }

const DEBOUNCE_MS = 500

export function produtosLoteInfiniteQueryKey(
  filters: ProdutosLoteFilterState,
  empresaId: string | null
) {
  return ['produtos', 'lote', 'infinite', empresaId, filters] as const
}

export function getNextProdutosLoteOffset(
  lastPage: ProdutosLotePage,
  allPages: ProdutosLotePage[]
): number | undefined {
  const loadedCount = allPages.reduce((acc, page) => acc + page.list.length, 0)
  if (lastPage.list.length === 0) return undefined
  if (lastPage.list.length < PRODUTOS_LOTE_PAGE_SIZE) return undefined
  if (lastPage.count !== null && loadedCount >= lastPage.count) return undefined
  return loadedCount
}

/** Achata páginas do infinite query e deduplica por id. */
export function flattenProdutosLotePages(
  data: InfiniteData<ProdutosLotePage> | undefined
): { produtos: Produto[]; total: number } {
  if (!data?.pages.length) {
    return { produtos: [], total: 0 }
  }

  const seen = new Set<string>()
  const produtos: Produto[] = []
  for (const page of data.pages) {
    for (const produto of page.list) {
      const id = produto.getId()
      if (!seen.has(id)) {
        seen.add(id)
        produtos.push(produto)
      }
    }
  }

  const lastCount = data.pages[data.pages.length - 1]?.count
  const total = lastCount ?? produtos.length
  return { produtos, total }
}

function useDebouncedProdutosLoteFilters(filters: ProdutosLoteFilterState): ProdutosLoteFilterState {
  const [debounced, setDebounced] = useState(filters)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(filters), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [
    filters.searchText,
    filters.filterStatus,
    filters.ativoLocalFilter,
    filters.ativoDeliveryFilter,
    filters.grupoProdutoFilter,
  ])

  return debounced
}

/**
 * Listagem infinita de produtos para o fluxo de atualização em lote.
 * Debounce de 500ms nos filtros, cache React Query e scroll infinito (sentinel + ancestor).
 */
export function useProdutosLoteInfinite(filters: ProdutosLoteFilterState) {
  const { auth } = useAuthStore()
  const token = auth?.getAccessToken()
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const debouncedFilters = useDebouncedProdutosLoteFilters(filters)

  const listaAreaRef = useRef<HTMLDivElement>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const fetchNextPageRef = useRef<() => void>(() => {})

  const queryKey = produtosLoteInfiniteQueryKey(debouncedFilters, empresaId)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isError,
  } = useInfiniteQuery<
    ProdutosLotePage,
    Error,
    InfiniteData<ProdutosLotePage>,
    ReturnType<typeof produtosLoteInfiniteQueryKey>,
    number
  >({
    queryKey,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      fetchProdutosLotePage(debouncedFilters, pageParam, token!, signal),
    getNextPageParam: getNextProdutosLoteOffset,
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  })

  const { produtos, total } = useMemo(() => flattenProdutosLotePages(data), [data])

  const hasMoreProdutos = Boolean(hasNextPage) && produtos.length > 0
  const isLoadingMore = isFetchingNextPage

  const carregarMaisProdutos = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return
    void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage])

  useEffect(() => {
    fetchNextPageRef.current = carregarMaisProdutos
  }, [carregarMaisProdutos])

  /** Rolagem no `main` (layout produtos): dispara “carregar mais” perto do fim. */
  useEffect(() => {
    const scrollEl = findScrollableAncestor(listaAreaRef.current)
    if (!scrollEl) return

    const onScroll = () => {
      const { scrollTop, clientHeight, scrollHeight } = scrollEl
      if (scrollHeight - scrollTop - clientHeight < 280) {
        fetchNextPageRef.current()
      }
    }

    scrollEl.addEventListener('scroll', onScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', onScroll)
  }, [hasMoreProdutos, isLoading, produtos.length])

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current
    if (!sentinel || !hasMoreProdutos || isLoading) {
      return
    }

    const root = findScrollableAncestor(sentinel)

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry?.isIntersecting) {
          fetchNextPageRef.current()
        }
      },
      { root: root ?? null, rootMargin: '200px', threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMoreProdutos, isLoading, produtos.length])

  /** Recarrega a listagem do zero (após salvar em lote). */
  const buscarProdutos = useCallback(async () => {
    await queryClient.resetQueries({ queryKey, exact: true })
    await refetch()
  }, [queryClient, queryKey, refetch])

  return {
    produtos,
    total,
    isLoading,
    isLoadingMore,
    hasMoreProdutos,
    buscarProdutos,
    carregarMaisProdutos,
    listaAreaRef,
    loadMoreSentinelRef,
    isError,
  }
}
