'use client'

import { keepPreviousData } from '@tanstack/react-query'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

/** Máximo aceito pelo `PaginationValidator` do backend (`limit` ≤ 100). */
export const MENU_CATALOG_PAGE_SIZE = 100

async function parseError(response: Response, fallback: string) {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

interface UseMenuProdutosParams {
  menuId: string | undefined
  q?: string
  grupoProdutoId?: string
  grupoComplementosId?: string
  ativo?: boolean | null
  favorito?: boolean | null
  tipo?: 'all' | 'padrao' | 'pizza'
  limit?: number
  enabled?: boolean
}

export interface MenuProdutosPage {
  items: MenuProduto[]
  count: number
  nextOffset: number | null
}

/**
 * Snapshots de produtos vinculados a um menu (paginação infinita, mesmo padrão do cadastro).
 */
export function useMenuProdutos(params: UseMenuProdutosParams) {
  const {
    menuId,
    q = '',
    grupoProdutoId,
    grupoComplementosId,
    ativo = null,
    favorito = null,
    tipo = 'all',
    limit = MENU_CATALOG_PAGE_SIZE,
    enabled = true,
  } = params

  return useSecureTenantInfiniteQuery<MenuProdutosPage, number>(
    ['menu-produtos', menuId, q, grupoProdutoId, grupoComplementosId, ativo, favorito, tipo, limit],
    async ({ token }, pageParam) => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      searchParams.set('offset', String(pageParam))
      if (q.trim()) searchParams.set('q', q.trim())
      if (grupoProdutoId) searchParams.set('grupoProdutoId', grupoProdutoId)
      if (grupoComplementosId) searchParams.set('grupoComplementosId', grupoComplementosId)
      if (ativo !== null) searchParams.set('ativo', String(ativo))
      if (favorito !== null) searchParams.set('favorito', String(favorito))
      if (tipo) searchParams.set('tipo', tipo)

      const response = await fetchGestorApi(
        `/api/menus/${menuId}/produtos?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) await parseError(response, 'Erro ao carregar produtos do menu')

      const data = await response.json()
      const items = (data.items ?? []) as MenuProduto[]
      const hasMore = items.length === limit
      return {
        items,
        count: data.count ?? 0,
        nextOffset: hasMore ? pageParam + items.length : null,
      }
    },
    {
      enabled: Boolean(menuId) && enabled,
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    }
  )
}

interface UseMenuGruposParams {
  menuId: string | undefined
  q?: string
  limit?: number
  enabled?: boolean
}

export interface MenuGruposPage {
  items: MenuGrupoProduto[]
  count: number
  nextOffset: number | null
}

/**
 * Snapshots de grupos vinculados a um menu (paginação infinita).
 */
export function useMenuGruposProdutos(params: UseMenuGruposParams) {
  const { menuId, q = '', limit = MENU_CATALOG_PAGE_SIZE, enabled = true } = params

  return useSecureTenantInfiniteQuery<MenuGruposPage, number>(
    ['menu-grupos', menuId, q, limit],
    async ({ token }, pageParam) => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      searchParams.set('offset', String(pageParam))
      if (q.trim()) searchParams.set('q', q.trim())

      const response = await fetchGestorApi(
        `/api/menus/${menuId}/grupos-produtos?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) await parseError(response, 'Erro ao carregar categorias do menu')

      const data = await response.json()
      const items = (data.items ?? []) as MenuGrupoProduto[]
      const hasMore = items.length === limit
      return {
        items,
        count: data.count ?? 0,
        nextOffset: hasMore ? pageParam + items.length : null,
      }
    },
    {
      enabled: Boolean(menuId) && enabled,
      initialPageParam: 0,
      getNextPageParam: lastPage => lastPage.nextOffset,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      placeholderData: keepPreviousData,
    }
  )
}
