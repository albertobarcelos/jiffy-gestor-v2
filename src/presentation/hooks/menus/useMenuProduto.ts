'use client'

import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { MenuProduto } from '@/src/shared/types/menus'

async function parseError(response: Response, fallback: string): Promise<never> {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

/**
 * Snapshot do produto em um cardápio específico.
 * `GET /api/menus/:menuId/produtos/:produtoId`
 */
export function useMenuProduto(
  menuId: string | undefined,
  produtoId: string | undefined,
  enabled = true
) {
  return useSecureTenantQuery<MenuProduto>(
    ['menu-produto', menuId, produtoId],
    async ({ token }) => {
      if (!menuId || !produtoId) throw new Error('Menu e produto são obrigatórios')
      const response = await fetchGestorApi(`/api/menus/${menuId}/produtos/${produtoId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      if (!response.ok) await parseError(response, 'Erro ao carregar produto deste cardápio')
      const payload = await response.json()
      const data =
        payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
          ? payload.data
          : payload
      return data as MenuProduto
    },
    {
      enabled: Boolean(menuId && produtoId && enabled),
      staleTime: 1000 * 60,
    }
  )
}
