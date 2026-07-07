'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import {
  fetchCatalogoPublico,
  fetchMeiosPagamentoPublicos,
} from '@/src/infrastructure/api/publicDeliveryApi'
import type {
  CatalogoPublicoComplementoDTO,
  CatalogoPublicoGrupoComplementoDTO,
} from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { create } from 'zustand'

const CATALOGO_PAGE_LIMIT = 20

export function publicDeliveryCatalogQueryKey(slug: string, offset: number, limit: number) {
  return ['public-delivery', slug, 'catalogo', offset, limit] as const
}

export function publicDeliveryCatalogInfiniteQueryKey(slug: string) {
  return ['public-delivery', slug, 'catalogo', 'infinite'] as const
}

export function publicDeliveryMeiosPagamentoQueryKey(slug: string) {
  return ['public-delivery', slug, 'meios-pagamento'] as const
}

/** Cache local de complementos (enviados só na 1ª página do catálogo). */
type ComplementosCache = {
  gruposComplementos: CatalogoPublicoGrupoComplementoDTO[]
  complementos: CatalogoPublicoComplementoDTO[]
}

interface PublicDeliveryComplementosState {
  porSlug: Record<string, ComplementosCache>
  salvar: (slug: string, data: ComplementosCache) => void
  obter: (slug: string) => ComplementosCache | null
}

export const usePublicDeliveryComplementosStore = create<PublicDeliveryComplementosState>(
  (set, get) => ({
    porSlug: {},
    salvar: (slug, data) =>
      set(state => ({
        porSlug: { ...state.porSlug, [slug]: data },
      })),
    obter: slug => get().porSlug[slug] ?? null,
  })
)

export function usePublicDeliveryCatalogPage(
  slug: string,
  options?: { offset?: number; limit?: number; enabled?: boolean }
) {
  const offset = options?.offset ?? 0
  const limit = options?.limit ?? CATALOGO_PAGE_LIMIT
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)

  return useQuery({
    queryKey: publicDeliveryCatalogQueryKey(slug, offset, limit),
    queryFn: async () => {
      const data = await fetchCatalogoPublico(slug, { offset, limit })
      if (
        offset === 0 &&
        data.catalogo.gruposComplementos &&
        data.catalogo.complementos
      ) {
        salvarComplementos(slug, {
          gruposComplementos: data.catalogo.gruposComplementos,
          complementos: data.catalogo.complementos,
        })
      }
      return data
    },
    enabled: (options?.enabled ?? true) && !!slug,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false
      }
      return failureCount < 2
    },
  })
}

export function usePublicDeliveryCatalogInfinite(slug: string, enabled = true) {
  const salvarComplementos = usePublicDeliveryComplementosStore(s => s.salvar)

  return useInfiniteQuery({
    queryKey: publicDeliveryCatalogInfiniteQueryKey(slug),
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number
      const data = await fetchCatalogoPublico(slug, {
        offset,
        limit: CATALOGO_PAGE_LIMIT,
      })
      if (
        offset === 0 &&
        data.catalogo.gruposComplementos &&
        data.catalogo.complementos
      ) {
        salvarComplementos(slug, {
          gruposComplementos: data.catalogo.gruposComplementos,
          complementos: data.catalogo.complementos,
        })
      }
      return data
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) => {
      if (!lastPage.catalogo.paginacao.hasNext) return undefined
      return (lastPageParam as number) + lastPage.catalogo.paginacao.limit
    },
    enabled: enabled && !!slug,
    staleTime: 60_000,
    retry: (failureCount, error) => {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return false
      }
      return failureCount < 2
    },
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
