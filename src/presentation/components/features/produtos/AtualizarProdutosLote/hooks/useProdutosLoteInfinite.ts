'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  keepPreviousData,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { Produto } from '@/src/domain/entities/Produto'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { PRODUTOS_LOTE_PAGE_SIZE } from '../constants'
import type { ProdutosLoteFilterState } from '../types'
import { fetchProdutosLotePage } from '../utils/produtosLoteApi'
import {
  applyFiscalPatchToProdutosLoteInfinite,
  type ProdutosLoteInfinitePage,
} from '../utils/produtosLoteCache'
import { findScrollableAncestor } from '../utils/produtosLoteUi'
import type { FiscalColunaGridId } from '../types'

export type ProdutosLotePage = ProdutosLoteInfinitePage

const DEBOUNCE_MS = 500

/** Base key sem prefixo tenant — useSecureTenantInfiniteQuery adiciona `['tenant', empresaId, ...]`. */
export function produtosLoteInfiniteBaseKey(filters: ProdutosLoteFilterState) {
  return ['produtos', 'lote', 'infinite', filters] as const
}

export function produtosLoteInfiniteQueryKey(
  filters: ProdutosLoteFilterState,
  empresaId: string | null
) {
  return buildTenantQueryKey(empresaId, produtosLoteInfiniteBaseKey(filters))
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
    filters.filtroColunaVazia,
    filters.filtroNcm,
  ])

  return debounced
}

/**
 * Listagem infinita de produtos para o fluxo de atualização em lote.
 * Debounce de 500ms nos filtros, cache React Query tenant-scoped e scroll infinito.
 */
export function useProdutosLoteInfinite(filters: ProdutosLoteFilterState) {
  const empresaId = useTenantEmpresaId()
  const queryClient = useQueryClient()
  const debouncedFilters = useDebouncedProdutosLoteFilters(filters)

  const listaAreaRef = useRef<HTMLDivElement>(null)
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null)
  const fetchNextPageRef = useRef<() => void>(() => {})

  const baseKey = produtosLoteInfiniteBaseKey(debouncedFilters)
  const queryKey = produtosLoteInfiniteQueryKey(debouncedFilters, empresaId)

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isError,
  } = useSecureTenantInfiniteQuery(
    baseKey,
    ({ token }, pageParam) =>
      fetchProdutosLotePage(debouncedFilters, pageParam as number, token),
    {
      initialPageParam: 0,
      getNextPageParam: getNextProdutosLoteOffset,
      placeholderData: keepPreviousData,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    }
  )

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
      entries => {
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

  /** Atualiza um campo fiscal no cache (edição inline, sem refetch). */
  const atualizarProdutoFiscalLocal = useCallback(
    (produtoId: string, coluna: FiscalColunaGridId, valorNormalizado: string | null) => {
      queryClient.setQueryData<InfiniteData<ProdutosLotePage>>(queryKey, old =>
        applyFiscalPatchToProdutosLoteInfinite(old, produtoId, coluna, valorNormalizado)
      )
    },
    [queryClient, queryKey]
  )

  return {
    produtos,
    total,
    isLoading,
    isLoadingMore,
    hasMoreProdutos,
    buscarProdutos,
    atualizarProdutoFiscalLocal,
    carregarMaisProdutos,
    listaAreaRef,
    loadMoreSentinelRef,
    isError,
  }
}
