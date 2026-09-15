'use client'

import { useCallback, useEffect, useRef } from 'react'
import {
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query'

export type CatalogPageLike = {
  count: number
  nextOffset: number | null
}

export type PrefetchRemainingCatalogPagesParams<TPage extends CatalogPageLike> = {
  /** Query key completa (já com prefixo tenant). */
  queryKey: QueryKey
  data: InfiniteData<TPage> | undefined
  isFetching: boolean
  pageSize: number
  enabled?: boolean
  fetchPage: (offset: number) => Promise<TPage>
}

/**
 * Após a 1ª página, busca o restante em paralelo e injeta no cache InfiniteQuery.
 * Evita a cadeia sequencial `fetchNextPage` em loop.
 */
export function usePrefetchRemainingCatalogPages<TPage extends CatalogPageLike>({
  queryKey,
  data,
  isFetching,
  pageSize,
  enabled = true,
  fetchPage,
}: PrefetchRemainingCatalogPagesParams<TPage>): void {
  const queryClient = useQueryClient()
  const inFlightRef = useRef(false)
  const keySig = JSON.stringify(queryKey)
  const fetchPageRef = useRef(fetchPage)
  fetchPageRef.current = fetchPage

  useEffect(() => {
    inFlightRef.current = false
  }, [keySig])

  useEffect(() => {
    if (!enabled || isFetching || inFlightRef.current) return
    if (!data?.pages.length) return
    // Só dispara a partir da 1ª página (evita corrida com merges parciais).
    if (data.pages.length > 1) return

    const first = data.pages[0]
    if (!first || first.nextOffset == null) return

    const offsets: number[] = []
    if (first.count > pageSize) {
      for (let offset = pageSize; offset < first.count; offset += pageSize) {
        offsets.push(offset)
      }
    } else {
      offsets.push(first.nextOffset)
    }

    if (offsets.length === 0) return

    inFlightRef.current = true
    let cancelled = false

    void (async () => {
      try {
        const rest = await Promise.all(
          offsets.map(offset => fetchPageRef.current(offset))
        )
        if (cancelled) return

        queryClient.setQueryData<InfiniteData<TPage>>(queryKey, prev => {
          if (!prev?.pages.length) return prev
          if (prev.pages.length > 1) return prev
          return {
            pages: [prev.pages[0], ...rest],
            pageParams: [prev.pageParams[0], ...offsets],
          }
        })

        const last = rest[rest.length - 1]
        if (last?.nextOffset != null) {
          inFlightRef.current = false
        }
      } catch {
        if (!cancelled) inFlightRef.current = false
      }
    })()

    return () => {
      cancelled = true
    }
  }, [data, enabled, isFetching, pageSize, queryClient, queryKey])
}

/** Estabiliza `fetchPage` quando as deps mudam (evita reset do prefetch). */
export function useStableFetchPage<T>(
  fetchPage: (offset: number) => Promise<T>
): (offset: number) => Promise<T> {
  const ref = useRef(fetchPage)
  ref.current = fetchPage
  return useCallback((offset: number) => ref.current(offset), [])
}
