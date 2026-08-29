'use client'

import { keepPreviousData } from '@tanstack/react-query'
import {
  listarMenuGruposViaBffUseCase,
  listarMenuProdutosViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

/** Máximo aceito pelo `PaginationValidator` do backend (`limit` ≤ 100). */
export const MENU_CATALOG_PAGE_SIZE = 100

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
      if (!menuId) throw new Error('Menu não informado')
      const data = await listarMenuProdutosViaBffUseCase.execute({
        token,
        menuId,
        q,
        grupoProdutoId,
        grupoComplementosId,
        ativo,
        favorito,
        tipo,
        limit,
        offset: pageParam,
      })
      const hasMore = data.items.length === limit
      return {
        items: data.items,
        count: data.count,
        nextOffset: hasMore ? pageParam + data.items.length : null,
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
      if (!menuId) throw new Error('Menu não informado')
      const data = await listarMenuGruposViaBffUseCase.execute({
        token,
        menuId,
        q,
        limit,
        offset: pageParam,
      })
      const hasMore = data.items.length === limit
      return {
        items: data.items,
        count: data.count,
        nextOffset: hasMore ? pageParam + data.items.length : null,
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
