import type { GetCatalogoPublicoResponseDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'

/** Paginação por grupos — máximo alinhado ao backend. */
export const CATALOGO_GRUPOS_PAGE_LIMIT = 20

/** staleTime do catálogo / meios — alinhado ao default do QueryProvider (5 min). */
export const CATALOGO_QUERY_STALE_MS = 1000 * 60 * 5

export function publicDeliveryCatalogQueryKey(slug: string, offset: number, limit: number) {
  return ['public-delivery', slug, 'catalogo', offset, limit] as const
}

export function publicDeliveryCatalogInfiniteQueryKey(slug: string) {
  return ['public-delivery', slug, 'catalogo', 'infinite', CATALOGO_GRUPOS_PAGE_LIMIT] as const
}

/** Mesma regra no prefetch RSC e no `useInfiniteQuery` do client. */
export function getCatalogoInfiniteNextPageParam(
  lastPage: GetCatalogoPublicoResponseDTO,
  _pages: unknown,
  lastPageParam: unknown
): number | undefined {
  if (!lastPage.catalogo.paginacao.hasNext) return undefined
  return (lastPageParam as number) + lastPage.catalogo.paginacao.limit
}

export function publicDeliveryMeiosPagamentoQueryKey(slug: string) {
  return ['public-delivery', slug, 'meios-pagamento'] as const
}
