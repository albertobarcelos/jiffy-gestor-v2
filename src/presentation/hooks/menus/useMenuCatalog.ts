'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'

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
  ativo?: boolean | null
  limit?: number
  enabled?: boolean
}

/**
 * Snapshots de produtos vinculados a um menu.
 */
export function useMenuProdutos(params: UseMenuProdutosParams) {
  const {
    menuId,
    q = '',
    grupoProdutoId,
    ativo = true,
    limit = 100,
    enabled = true,
  } = params

  return useSecureTenantQuery<{ items: MenuProduto[]; count: number }>(
    ['menu-produtos', menuId, q, grupoProdutoId, ativo, limit],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      searchParams.set('offset', '0')
      if (q.trim()) searchParams.set('q', q.trim())
      if (grupoProdutoId) searchParams.set('grupoProdutoId', grupoProdutoId)
      if (ativo !== null) searchParams.set('ativo', String(ativo))

      const response = await fetchGestorApi(
        `/api/menus/${menuId}/produtos?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) await parseError(response, 'Erro ao carregar produtos do menu')

      const data = await response.json()
      return {
        items: (data.items ?? []) as MenuProduto[],
        count: data.count ?? 0,
      }
    },
    { enabled: Boolean(menuId) && enabled, staleTime: 1000 * 60 * 5 }
  )
}

interface UseMenuGruposParams {
  menuId: string | undefined
  q?: string
  limit?: number
  enabled?: boolean
}

/**
 * Snapshots de grupos vinculados a um menu (ordem/nome naquele cardápio).
 */
export function useMenuGruposProdutos(params: UseMenuGruposParams) {
  const { menuId, q = '', limit = 100, enabled = true } = params

  return useSecureTenantQuery<{ items: MenuGrupoProduto[]; count: number }>(
    ['menu-grupos', menuId, q, limit],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      searchParams.set('offset', '0')
      if (q.trim()) searchParams.set('q', q.trim())

      const response = await fetchGestorApi(
        `/api/menus/${menuId}/grupos-produtos?${searchParams}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!response.ok) await parseError(response, 'Erro ao carregar grupos do menu')

      const data = await response.json()
      return {
        items: (data.items ?? []) as MenuGrupoProduto[],
        count: data.count ?? 0,
      }
    },
    { enabled: Boolean(menuId) && enabled, staleTime: 1000 * 60 * 5 }
  )
}
