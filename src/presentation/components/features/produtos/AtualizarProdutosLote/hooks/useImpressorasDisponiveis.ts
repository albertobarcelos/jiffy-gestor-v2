'use client'

import { useEffect, useMemo } from 'react'
import { Impressora } from '@/src/domain/entities/Impressora'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'

const IMPRESSORAS_LOTE_PAGE_SIZE = 50

interface ImpressorasLotePage {
  impressoras: Impressora[]
  nextOffset: number | null
}

async function fetchImpressorasLotePage(
  offset: number,
  token: string
): Promise<ImpressorasLotePage> {
  const params = new URLSearchParams({
    limit: IMPRESSORAS_LOTE_PAGE_SIZE.toString(),
    offset: offset.toString(),
  })

  const response = await fetchGestorApi(`/api/impressoras?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Erro ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()
  const impressorasList = Array.isArray(data.items) ? data.items : []

  const impressoras = impressorasList
    .map((item: unknown) => {
      try {
        return Impressora.fromJSON(item as Record<string, unknown>)
      } catch (error) {
        console.error('Erro ao parsear impressora:', error, item)
        return null
      }
    })
    .filter((item: Impressora | null): item is Impressora => item !== null)

  const hasMore = impressoras.length === IMPRESSORAS_LOTE_PAGE_SIZE
  return {
    impressoras,
    nextOffset: hasMore ? offset + impressoras.length : null,
  }
}

function flattenImpressorasLotePages(pages: ImpressorasLotePage[] | undefined): Impressora[] {
  if (!pages?.length) return []

  const seen = new Set<string>()
  const result: Impressora[] = []
  for (const page of pages) {
    for (const impressora of page.impressoras) {
      const id = impressora.getId()
      if (!seen.has(id)) {
        seen.add(id)
        result.push(impressora)
      }
    }
  }
  return result
}

export function useImpressorasDisponiveis(enabled: boolean) {
  const query = useSecureTenantInfiniteQuery(
    ['impressoras', 'lote', 'todas'],
    ({ token }, pageParam) => fetchImpressorasLotePage(pageParam as number, token),
    {
      initialPageParam: 0,
      getNextPageParam: (lastPage: ImpressorasLotePage) => lastPage.nextOffset ?? undefined,
      enabled,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    }
  )

  useEffect(() => {
    if (!enabled) return
    if (query.hasNextPage && !query.isFetchingNextPage && !query.isLoading) {
      void query.fetchNextPage()
    }
  }, [
    enabled,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.isLoading,
    query.dataUpdatedAt,
    query.fetchNextPage,
  ])

  useEffect(() => {
    if (query.isError) {
      console.error('Erro ao buscar impressoras', query.error)
      showToast.error('Erro ao carregar impressoras')
    }
  }, [query.isError, query.error])

  const impressorasDisponiveis = useMemo(
    () => flattenImpressorasLotePages(query.data?.pages),
    [query.data?.pages]
  )

  const isLoadingImpressoras =
    enabled && (query.isLoading || query.isFetchingNextPage || query.hasNextPage)

  return {
    impressorasDisponiveis,
    isLoadingImpressoras,
  }
}
