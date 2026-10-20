'use client'

import { useCallback } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import {
  listarMenuGruposViaBffUseCase,
  listarMenuProdutosViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import { useSecureTenantInfiniteQuery } from '@/src/presentation/hooks/useSecureTenantInfiniteQuery'
import { useTenantQueryKey } from '@/src/presentation/hooks/useTenantQueryKey'
import {
  usePrefetchRemainingCatalogPages,
  useStableFetchPage,
} from '@/src/presentation/hooks/menus/usePrefetchRemainingCatalogPages'
import { useAuthStore } from '@/src/presentation/stores/authStore'
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
  /** Prefetch paralelo das páginas restantes após a 1ª. Default: true. */
  prefetchRemaining?: boolean
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
    prefetchRemaining = true,
  } = params

  const baseKey = [
    'menu-produtos',
    menuId,
    q,
    grupoProdutoId,
    grupoComplementosId,
    ativo,
    favorito,
    tipo,
    limit,
  ] as const
  const queryKey = useTenantQueryKey(baseKey)
  const tenantAuth = useAuthStore(s => s.tenantAuth)

  const query = useSecureTenantInfiniteQuery<MenuProdutosPage, number>(
    baseKey,
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

  const fetchPage = useStableFetchPage(
    useCallback(
      async (offset: number): Promise<MenuProdutosPage> => {
        if (!menuId) throw new Error('Menu não informado')
        const token = tenantAuth?.getAccessToken()
        if (!token) throw new Error('Sessão de empresa não encontrada')
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
          offset,
        })
        const hasMore = data.items.length === limit
        return {
          items: data.items,
          count: data.count,
          nextOffset: hasMore ? offset + data.items.length : null,
        }
      },
      [
        ativo,
        favorito,
        grupoComplementosId,
        grupoProdutoId,
        limit,
        menuId,
        q,
        tenantAuth,
        tipo,
      ]
    )
  )

  usePrefetchRemainingCatalogPages({
    queryKey,
    data: query.data,
    isFetching: query.isFetching,
    pageSize: limit,
    enabled: prefetchRemaining && Boolean(menuId) && enabled,
    fetchPage,
  })

  return query
}

interface UseMenuGruposParams {
  menuId: string | undefined
  q?: string
  limit?: number
  enabled?: boolean
  prefetchRemaining?: boolean
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
  const {
    menuId,
    q = '',
    limit = MENU_CATALOG_PAGE_SIZE,
    enabled = true,
    prefetchRemaining = true,
  } = params

  const baseKey = ['menu-grupos', menuId, q, limit] as const
  const queryKey = useTenantQueryKey(baseKey)
  const tenantAuth = useAuthStore(s => s.tenantAuth)

  const query = useSecureTenantInfiniteQuery<MenuGruposPage, number>(
    baseKey,
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

  const fetchPage = useStableFetchPage(
    useCallback(
      async (offset: number): Promise<MenuGruposPage> => {
        if (!menuId) throw new Error('Menu não informado')
        const token = tenantAuth?.getAccessToken()
        if (!token) throw new Error('Sessão de empresa não encontrada')
        const data = await listarMenuGruposViaBffUseCase.execute({
          token,
          menuId,
          q,
          limit,
          offset,
        })
        const hasMore = data.items.length === limit
        return {
          items: data.items,
          count: data.count,
          nextOffset: hasMore ? offset + data.items.length : null,
        }
      },
      [limit, menuId, q, tenantAuth]
    )
  )

  usePrefetchRemainingCatalogPages({
    queryKey,
    data: query.data,
    isFetching: query.isFetching,
    pageSize: limit,
    enabled: prefetchRemaining && Boolean(menuId) && enabled,
    fetchPage,
  })

  return query
}
