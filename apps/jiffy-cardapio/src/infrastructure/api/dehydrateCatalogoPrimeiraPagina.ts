import {
  dehydrate,
  QueryClient,
  type DehydratedState,
} from '@tanstack/react-query'
import { fetchCatalogoPublicoUpstream } from '@/src/infrastructure/api/fetchCatalogoPublicoUpstream'
import {
  CATALOGO_GRUPOS_PAGE_LIMIT,
  CATALOGO_QUERY_STALE_MS,
  publicDeliveryCatalogInfiniteQueryKey,
} from '@/src/presentation/hooks/publicDeliveryCatalogKeys'

/**
 * Prefetch best-effort da 1ª página do catálogo para hidratar o React Query no RSC.
 */
export async function dehydrateCatalogoPrimeiraPagina(
  slug: string
): Promise<DehydratedState | undefined> {
  const slugNormalizado = slug.trim()
  if (!slugNormalizado) return undefined

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: CATALOGO_QUERY_STALE_MS,
      },
    },
  })

  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: publicDeliveryCatalogInfiniteQueryKey(slugNormalizado),
      queryFn: async ({ pageParam }) =>
        fetchCatalogoPublicoUpstream(slugNormalizado, {
          offset: pageParam as number,
          limit: CATALOGO_GRUPOS_PAGE_LIMIT,
        }),
      initialPageParam: 0,
      pages: 1,
      staleTime: CATALOGO_QUERY_STALE_MS,
    })
  } catch {
    // Prefetch best-effort: a home busca de novo no client se falhar.
  }

  return dehydrate(queryClient)
}
