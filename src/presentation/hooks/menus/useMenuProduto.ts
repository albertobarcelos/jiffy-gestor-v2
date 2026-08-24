'use client'

import { type QueryClient } from '@tanstack/react-query'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
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

export function menuProdutoQueryBaseKey(menuId: string, produtoId: string) {
  return ['menu-produto', menuId, produtoId] as const
}

export async function fetchMenuProdutoSnapshot(
  token: string,
  menuId: string,
  produtoId: string
): Promise<MenuProduto> {
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
}

/**
 * Remove cache antigo e pré-carrega snapshots após vincular/revincular menus.
 * Evita exibir dados obsoletos (ex.: imagem ausente após restore do soft-delete).
 */
export async function refreshMenuProdutoSnapshotsCache(
  queryClient: QueryClient,
  empresaId: string | null,
  token: string,
  produtoId: string,
  menuIds: readonly string[]
): Promise<void> {
  if (!empresaId || !produtoId) return
  const uniqueMenuIds = [...new Set(menuIds.filter(Boolean))]
  if (uniqueMenuIds.length === 0) return

  await Promise.all(
    uniqueMenuIds.map(async menuId => {
      const queryKey = buildTenantQueryKey(
        empresaId,
        menuProdutoQueryBaseKey(menuId, produtoId)
      )
      await queryClient.removeQueries({ queryKey, exact: true })
      await queryClient.prefetchQuery({
        queryKey,
        queryFn: () => fetchMenuProdutoSnapshot(token, menuId, produtoId),
      })
    })
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
      return fetchMenuProdutoSnapshot(token, menuId, produtoId)
    },
    {
      enabled: Boolean(menuId && produtoId && enabled),
      staleTime: 0,
      refetchOnMount: 'always',
    }
  )
}
