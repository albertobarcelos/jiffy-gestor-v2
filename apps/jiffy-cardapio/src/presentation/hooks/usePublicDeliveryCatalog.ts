'use client'

import { useEffect } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query'
import {
  listarMeiosPagamentoPublicoUseCase,
  obterCatalogoPublicoUseCase,
} from '@/src/infrastructure/di/deliveryPublicoUseCases'
import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
  CatalogoPublicoPaginaDTO,
  GetCatalogoPublicoResponseDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { create } from 'zustand'
import {
  CATALOGO_GRUPOS_PAGE_LIMIT,
  CATALOGO_QUERY_STALE_MS,
  publicDeliveryCatalogInfiniteQueryKey,
  publicDeliveryCatalogQueryKey,
  publicDeliveryMeiosPagamentoQueryKey,
} from '@/src/presentation/hooks/publicDeliveryCatalogKeys'

export {
  CATALOGO_GRUPOS_PAGE_LIMIT,
  CATALOGO_QUERY_STALE_MS,
  publicDeliveryCatalogInfiniteQueryKey,
  publicDeliveryCatalogQueryKey,
  publicDeliveryMeiosPagamentoQueryKey,
} from '@/src/presentation/hooks/publicDeliveryCatalogKeys'

const complementosStorageKey = (slug: string) => `cardapio-delivery-complementos:${slug}`

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

function limparComplementosStorage(slug: string) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(complementosStorageKey(slug))
  } catch {
    /* quota / modo privado */
  }
}

/** Invalida cache React Query e complementos locais do catálogo público após mudar menu/slug. */
export function invalidatePublicDeliveryCatalogForSlug(
  queryClient: QueryClient,
  slug: string | null | undefined
) {
  const slugNormalizado = slug?.trim()
  if (!slugNormalizado) return

  limparComplementosStorage(slugNormalizado)
  usePublicDeliveryComplementosStore.setState(state => {
    if (!state.porSlug[slugNormalizado]) return state
    const next = { ...state.porSlug }
    delete next[slugNormalizado]
    return { porSlug: next }
  })

  void queryClient.invalidateQueries({
    queryKey: ['public-delivery', slugNormalizado],
  })
}

export const EMPRESA_DELIVERY_UPDATED_EVENT = 'jiffy:empresa-delivery-updated'

export type EmpresaDeliveryUpdatedDetail = {
  slug?: string | null
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
      const data = await obterCatalogoPublicoUseCase.execute(slug, { offset, limit })
      persistirComplementosPrimeiraPagina(slug, offset, data.catalogo, salvarComplementos)
      return data
    },
    enabled: (options?.enabled ?? true) && !!slug,
    staleTime: CATALOGO_QUERY_STALE_MS,
    retry: catalogoRetry,
  })
}

export function usePublicDeliveryCatalogInfinite(slug: string, enabled = true) {
  const queryClient = useQueryClient()
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)
  const hidratarDoStorage = usePublicDeliveryComplementosStore(s => s.hidratarDoStorage)

  useEffect(() => {
    if (slug) hidratarDoStorage(slug)
  }, [slug, hidratarDoStorage])

  useEffect(() => {
    const onDeliveryUpdated = (event: Event) => {
      const detail = (event as CustomEvent<EmpresaDeliveryUpdatedDetail>).detail
      const slugAtualizado = detail?.slug?.trim()
      if (!slugAtualizado || slugAtualizado !== slug.trim()) return
      invalidatePublicDeliveryCatalogForSlug(queryClient, slugAtualizado)
    }

    window.addEventListener(EMPRESA_DELIVERY_UPDATED_EVENT, onDeliveryUpdated)
    return () =>
      window.removeEventListener(EMPRESA_DELIVERY_UPDATED_EVENT, onDeliveryUpdated)
  }, [queryClient, slug])

  return useInfiniteQuery<GetCatalogoPublicoResponseDTO, Error>({
    queryKey: publicDeliveryCatalogInfiniteQueryKey(slug),
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number
      const data = await obterCatalogoPublicoUseCase.execute(slug, {
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
    staleTime: CATALOGO_QUERY_STALE_MS,
    retry: catalogoRetry,
  })
}

/**
 * Carrega as páginas restantes do catálogo em lotes paralelos (até 3),
 * usando `totalPages` da 1ª página — evita waterfall estritamente sequencial.
 */
export function useAutoFetchCatalogoGrupos(
  slug: string,
  query: Pick<
    UseInfiniteQueryResult<InfiniteData<GetCatalogoPublicoResponseDTO>, Error>,
    'data' | 'isSuccess' | 'isError'
  >
) {
  const queryClient = useQueryClient()
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)
  const totalPages = query.data?.pages[0]?.catalogo.paginacao.totalPages ?? 0
  const limit =
    query.data?.pages[0]?.catalogo.paginacao.limit || CATALOGO_GRUPOS_PAGE_LIMIT
  const pagesCarregadas = query.data?.pages.length ?? 0

  useEffect(() => {
    if (!query.isSuccess || query.isError || !slug.trim()) return
    if (totalPages <= 1 || pagesCarregadas >= totalPages) return

    let cancelled = false
    const queryKey = publicDeliveryCatalogInfiniteQueryKey(slug)
    const BATCH = 3

    const run = async () => {
      const loaded = new Set(
        (
          queryClient.getQueryData<InfiniteData<GetCatalogoPublicoResponseDTO>>(queryKey)
            ?.pageParams ?? []
        ).map(p => Number(p))
      )

      const missingOffsets: number[] = []
      for (let pageIndex = 1; pageIndex < totalPages; pageIndex++) {
        const offset = pageIndex * limit
        if (!loaded.has(offset)) missingOffsets.push(offset)
      }
      if (!missingOffsets.length) return

      for (let i = 0; i < missingOffsets.length; i += BATCH) {
        if (cancelled) return
        const batch = missingOffsets.slice(i, i + BATCH)
        const results = await Promise.all(
          batch.map(offset =>
            obterCatalogoPublicoUseCase.execute(slug, { offset, limit })
          )
        )
        if (cancelled) return

        queryClient.setQueryData<InfiniteData<GetCatalogoPublicoResponseDTO>>(
          queryKey,
          old => {
            if (!old) return old
            const paired = old.pages.map((page, idx) => ({
              page,
              param: Number(old.pageParams[idx]),
            }))
            const existing = new Set(paired.map(p => p.param))
            for (let j = 0; j < results.length; j++) {
              const offset = batch[j]
              if (existing.has(offset)) continue
              paired.push({ page: results[j], param: offset })
              existing.add(offset)
              persistirComplementosPrimeiraPagina(
                slug,
                offset,
                results[j].catalogo,
                salvarComplementos
              )
            }
            paired.sort((a, b) => a.param - b.param)
            return {
              pages: paired.map(p => p.page),
              pageParams: paired.map(p => p.param),
            }
          }
        )
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [
    slug,
    query.isSuccess,
    query.isError,
    totalPages,
    limit,
    pagesCarregadas,
    queryClient,
    salvarComplementos,
  ])
}

/**
 * Garante cache de complementos quando ausente (modal/carrinho).
 * Reusa a infinite query do catálogo (mesma query key) — sem GET offset=0 paralelo.
 */
export function useEnsureComplementosCatalogo(slug: string, enabled = true) {
  const cache = usePublicDeliveryComplementosStore(s => s.porSlug[slug] ?? null)
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)
  const hidratarDoStorage = usePublicDeliveryComplementosStore(s => s.hidratarDoStorage)

  useEffect(() => {
    if (slug) hidratarDoStorage(slug)
  }, [slug, hidratarDoStorage])

  const precisaCatalogo = Boolean(enabled && slug && !cache)
  const infinite = usePublicDeliveryCatalogInfinite(slug, precisaCatalogo)

  useEffect(() => {
    if (!slug || cache) return
    const catalogo = infinite.data?.pages[0]?.catalogo
    if (!catalogo) return
    persistirComplementosPrimeiraPagina(slug, 0, catalogo, salvarComplementos)
  }, [slug, cache, infinite.data, salvarComplementos])

  return {
    isLoading: Boolean(precisaCatalogo && !cache && infinite.isLoading),
    isFetching: infinite.isFetching,
    isError: infinite.isError,
    error: infinite.error,
  }
}

export function usePublicDeliveryMeiosPagamento(slug: string, enabled = true) {
  return useQuery({
    queryKey: publicDeliveryMeiosPagamentoQueryKey(slug),
    queryFn: () => listarMeiosPagamentoPublicoUseCase.execute(slug),
    enabled: enabled && !!slug,
    staleTime: CATALOGO_QUERY_STALE_MS,
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
    .flatMap(g => g.produtos.map(p => ({ ...p, grupoId: g.id, grupoNome: g.nome })))
    .filter(p => p.favorito)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
}
