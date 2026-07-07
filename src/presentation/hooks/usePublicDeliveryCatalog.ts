'use client'

import { useEffect } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query'
import {
  fetchCatalogoPublico,
  fetchMeiosPagamentoPublicos,
} from '@/src/infrastructure/api/publicDeliveryApi'
import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoPaginaDTO,
  GetCatalogoPublicoResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { create } from 'zustand'

/** Paginação por grupos — máximo permitido pelo backend. */
export const CATALOGO_GRUPOS_PAGE_LIMIT = 20

const complementosStorageKey = (slug: string) => `cardapio-delivery-complementos:${slug}`

export function publicDeliveryCatalogQueryKey(slug: string, offset: number, limit: number) {
  return ['public-delivery', slug, 'catalogo', offset, limit] as const
}

export function publicDeliveryCatalogInfiniteQueryKey(slug: string) {
  return ['public-delivery', slug, 'catalogo', 'infinite', CATALOGO_GRUPOS_PAGE_LIMIT] as const
}

export function publicDeliveryMeiosPagamentoQueryKey(slug: string) {
  return ['public-delivery', slug, 'meios-pagamento'] as const
}

/** Cache local de complementos (enviados só na 1ª página, offset=0). */
type ComplementosCache = {
  gruposComplementos: CatalogoPublicoGrupoComplementoDTO[]
  complementos: CatalogoPublicoComplementoDTO[]
}

function lerComplementosStorage(slug: string): ComplementosCache | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(complementosStorageKey(slug))
    if (!raw) return null
    const parsed = JSON.parse(raw) as ComplementosCache
    if (!Array.isArray(parsed.gruposComplementos) || !Array.isArray(parsed.complementos)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function gravarComplementosStorage(slug: string, data: ComplementosCache) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(complementosStorageKey(slug), JSON.stringify(data))
  } catch {
    /* quota / modo privado */
  }
}

/** Persiste complementos da 1ª página (offset=0) em memória e sessionStorage. */
export function persistirComplementosPrimeiraPagina(
  slug: string,
  offset: number,
  catalogo: CatalogoPublicoPaginaDTO,
  salvar: (slug: string, data: ComplementosCache) => void
) {
  if (offset !== 0) return
  if (!catalogo.gruposComplementos || !catalogo.complementos) return

  const cache: ComplementosCache = {
    gruposComplementos: catalogo.gruposComplementos,
    complementos: catalogo.complementos,
  }
  salvar(slug, cache)
  gravarComplementosStorage(slug, cache)
}

interface PublicDeliveryComplementosState {
  porSlug: Record<string, ComplementosCache>
  salvar: (slug: string, data: ComplementosCache) => void
  obter: (slug: string) => ComplementosCache | null
  hidratarDoStorage: (slug: string) => void
}

export const usePublicDeliveryComplementosStore = create<PublicDeliveryComplementosState>(
  (set, get) => ({
    porSlug: {},
    salvar: (slug, data) => {
      gravarComplementosStorage(slug, data)
      set(state => ({
        porSlug: { ...state.porSlug, [slug]: data },
      }))
    },
    obter: slug => get().porSlug[slug] ?? null,
    hidratarDoStorage: slug => {
      if (get().porSlug[slug]) return
      const doStorage = lerComplementosStorage(slug)
      if (!doStorage) return
      set(state => ({
        porSlug: { ...state.porSlug, [slug]: doStorage },
      }))
    },
  })
)

function catalogoRetry(failureCount: number, error: unknown) {
  if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
    return false
  }
  return failureCount < 2
}

export function usePublicDeliveryCatalogPage(
  slug: string,
  options?: { offset?: number; limit?: number; enabled?: boolean }
) {
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? CATALOGO_GRUPOS_PAGE_LIMIT
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)

  return useQuery({
    queryKey: publicDeliveryCatalogQueryKey(slug, offset, limit),
    queryFn: async () => {
      const data = await fetchCatalogoPublico(slug, { offset, limit })
      persistirComplementosPrimeiraPagina(slug, offset, data.catalogo, salvarComplementos)
      return data
    },
    enabled: (options?.enabled ?? true) && !!slug,
    staleTime: 60_000,
    retry: catalogoRetry,
  })
}

export function usePublicDeliveryCatalogInfinite(slug: string, enabled = true) {
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)
  const hidratarDoStorage = usePublicDeliveryComplementosStore(s => s.hidratarDoStorage)

  useEffect(() => {
    if (slug) hidratarDoStorage(slug)
  }, [slug, hidratarDoStorage])

  return useInfiniteQuery({
    queryKey: publicDeliveryCatalogInfiniteQueryKey(slug),
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number
      const data = await fetchCatalogoPublico(slug, {
        offset,
        limit: CATALOGO_GRUPOS_PAGE_LIMIT,
      })
      persistirComplementosPrimeiraPagina(slug, offset, data.catalogo, salvarComplementos)
      return data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (!lastPage.catalogo.paginacao.hasNext) return undefined
      return (lastPageParam as number) + lastPage.catalogo.paginacao.limit
    },
    enabled: enabled && !!slug,
    staleTime: 60_000,
    retry: catalogoRetry,
  })
}

/**
 * Carrega automaticamente todas as páginas de grupos (offset += limit).
 * Complementos continuam vindo só na 1ª — demais páginas retornam null.
 */
export function useAutoFetchCatalogoGrupos(
  query: Pick<
    UseInfiniteQueryResult<GetCatalogoPublicoResponseDTO, Error>,
    'hasNextPage' | 'isFetchingNextPage' | 'fetchNextPage' | 'isSuccess' | 'isError'
  >
) {
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isSuccess, isError } = query

  useEffect(() => {
    if (isSuccess && !isError && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [isSuccess, isError, hasNextPage, isFetchingNextPage, fetchNextPage])
}

/**
 * Garante cache de complementos (offset=0) quando ausente —
 * ex.: refresh na página 2 ou acesso direto ao carrinho/modal.
 */
export function useEnsureComplementosCatalogo(slug: string, enabled = true) {
  const cache = usePublicDeliveryComplementosStore(s => s.porSlug[slug] ?? null)
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)
  const hidratarDoStorage = usePublicDeliveryComplementosStore(s => s.hidratarDoStorage)

  useEffect(() => {
    if (slug) hidratarDoStorage(slug)
  }, [slug, hidratarDoStorage])

  return useQuery({
    queryKey: ['public-delivery', slug, 'catalogo', 'complementos-bootstrap'] as const,
    queryFn: async () => {
      const data = await fetchCatalogoPublico(slug, {
        offset: 0,
        limit: CATALOGO_GRUPOS_PAGE_LIMIT,
      })
      persistirComplementosPrimeiraPagina(slug, 0, data.catalogo, salvarComplementos)
      return data
    },
    enabled: enabled && !!slug && !cache,
    staleTime: 60_000,
    retry: catalogoRetry,
  })
}

export function usePublicDeliveryMeiosPagamento(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicDeliveryMeiosPagamentoQueryKey(slug),
    queryFn: () => fetchMeiosPagamentoPublicos(slug),
    enabled: enabled && !!slug,
    staleTime: 60_000,
  })
}

export function flattenCatalogoGrupos(
  pages: Array<{ catalogo: { gruposProdutos: import('@/src/application/dto/delivery-publico/DeliveryPublicoDTO').CatalogoPublicoGrupoProdutoDTO[] } }>
) {
  const map = new Map<string, import('@/src/application/dto/delivery-publico/DeliveryPublicoDTO').CatalogoPublicoGrupoProdutoDTO>()
  for (const page of pages) {
    for (const grupo of page.catalogo.gruposProdutos) {
      map.set(grupo.id, grupo)
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (a.ordem !== b.ordem) return a.ordem - b.ordem
    return a.nome.localeCompare(b.nome)
  })
}

export function listarProdutosFavoritos(
  grupos: import('@/src/application/dto/delivery-publico/DeliveryPublicoDTO').CatalogoPublicoGrupoProdutoDTO[]
) {
  return grupos
    .flatMap(g => g.produtos.map(p => ({ ...p, grupoNome: g.nome })))
    .filter(p => p.favorito)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
}
