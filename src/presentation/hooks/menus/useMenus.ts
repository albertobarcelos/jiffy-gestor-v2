'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { Menu } from '@/src/shared/types/menus'

interface UseMenusParams {
  q?: string
  ativo?: boolean | null
  tipo?: string
  limit?: number
  offset?: number
  enabled?: boolean
}

async function parseError(response: Response, fallback: string) {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

/**
 * Lista menus da empresa (cadastro de cardápios).
 */
export function useMenus(params: UseMenusParams = {}) {
  const {
    q = '',
    ativo = null,
    tipo,
    limit = 50,
    offset = 0,
    enabled = true,
  } = params

  return useSecureTenantQuery<{ items: Menu[]; count: number }>(
    ['menus', q, ativo, tipo, limit, offset],
    async ({ token }) => {
      const searchParams = new URLSearchParams()
      if (q.trim()) searchParams.set('q', q.trim())
      if (ativo !== null) searchParams.set('ativo', String(ativo))
      if (tipo) searchParams.set('tipo', tipo)
      searchParams.set('limit', String(limit))
      searchParams.set('offset', String(offset))

      const response = await fetchGestorApi(`/api/menus?${searchParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) await parseError(response, 'Erro ao carregar menus')

      const data = await response.json()
      return {
        items: (data.items ?? []) as Menu[],
        count: data.count ?? 0,
      }
    },
    { enabled }
  )
}

/**
 * Detalhe de um menu.
 */
export function useMenu(menuId: string | undefined, enabled = true) {
  return useSecureTenantQuery<Menu>(
    ['menu', menuId],
    async ({ token }) => {
      const response = await fetchGestorApi(`/api/menus/${menuId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) await parseError(response, 'Erro ao carregar menu')
      const data = await response.json()
      return data.data as Menu
    },
    { enabled: Boolean(menuId) && enabled }
  )
}
