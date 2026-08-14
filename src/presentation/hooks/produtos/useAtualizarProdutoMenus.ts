'use client'

import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type { UpdateProdutoMenusInput } from '@/src/shared/types/menus'

async function parseError(response: Response, fallback: string) {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

/**
 * PATCH dos vínculos de menus do produto. Invalida cache do produto e dos cardápios.
 */
export function useAtualizarProdutoMenus(produtoId: string | undefined) {
  const invalidate = useInvalidateTenantQueries()

  return useSecureTenantMutation(
    async ({ token }, input: UpdateProdutoMenusInput) => {
      if (!produtoId) throw new Error('Produto não informado')
      const response = await fetchGestorApi(`/api/produtos/${produtoId}/menus`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          add: input.add ?? [],
          remove: input.remove ?? [],
        }),
      })
      if (!response.ok) await parseError(response, 'Erro ao atualizar menus do produto')
      return response.json()
    },
    {
      onSuccess: async () => {
        if (produtoId) {
          await invalidate(['produto', produtoId])
        }
        await invalidate(['menus'])
        await invalidate(['menu'])
        await invalidate(['menu-produtos'])
        await invalidate(['menu-grupos'])
      },
    }
  )
}
