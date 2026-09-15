'use client'

import { type QueryClient } from '@tanstack/react-query'
import { buscarMenuProdutoViaBffUseCase } from '@/src/application/use-cases/menus/menuBffUseCases'
import { useSecureTenantQuery } from '@/src/presentation/hooks/useSecureTenantQuery'
import { buildTenantQueryKey } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type { MenuProduto } from '@/src/shared/types/menus'

export function menuProdutoQueryBaseKey(menuId: string, produtoId: string) {
  return ['menu-produto', menuId, produtoId] as const
}

export async function fetchMenuProdutoSnapshot(
  token: string,
  menuId: string,
  produtoId: string
): Promise<MenuProduto> {
  return buscarMenuProdutoViaBffUseCase.execute({ token, menuId, produtoId })
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
