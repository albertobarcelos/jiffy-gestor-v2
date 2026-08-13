'use client'

import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { ApiError } from '@/src/infrastructure/api/apiClient'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import type {
  CreateMenuInput,
  UpdateMenuInput,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'

async function parseError(response: Response, fallback: string) {
  const errorData = await response.json().catch(() => ({}))
  throw new ApiError(
    (errorData as { message?: string }).message || fallback,
    response.status,
    errorData
  )
}

async function invalidateMenuTree(
  invalidate: ReturnType<typeof useInvalidateTenantQueries>,
  menuId?: string
) {
  await invalidate(['menus'])
  if (menuId) {
    await invalidate(['menu', menuId])
    await invalidate(['menu-produtos', menuId])
    await invalidate(['menu-grupos', menuId])
  }
}

/** Mutations CRUD + vínculos do esboço de Menus. */
export function useMenuMutations(menuId?: string) {
  const invalidate = useInvalidateTenantQueries()

  const createMenu = useSecureTenantMutation(
    async ({ token }, input: CreateMenuInput) => {
      const response = await fetchGestorApi('/api/menus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })
      if (!response.ok) await parseError(response, 'Erro ao criar menu')
      return (await response.json()).data
    },
    { onSuccess: () => invalidate(['menus']) }
  )

  const updateMenu = useSecureTenantMutation(
    async ({ token }, vars: { id: string; input: UpdateMenuInput }) => {
      const response = await fetchGestorApi(`/api/menus/${vars.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(vars.input),
      })
      if (!response.ok) await parseError(response, 'Erro ao atualizar menu')
      return (await response.json()).data
    },
    { onSuccess: (_data, vars) => invalidateMenuTree(invalidate, vars.id) }
  )

  const deleteMenu = useSecureTenantMutation(
    async ({ token }, id: string) => {
      const response = await fetchGestorApi(`/api/menus/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) await parseError(response, 'Erro ao excluir menu')
    },
    { onSuccess: () => invalidate(['menus']) }
  )

  const syncProdutos = useSecureTenantMutation(
    async ({ token }, input: UpdateMenuProdutosBatchInput) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      const response = await fetchGestorApi(`/api/menus/${menuId}/produtos`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      })
      if (!response.ok) await parseError(response, 'Erro ao sincronizar produtos')
      return (await response.json()).data
    },
    { onSuccess: () => invalidateMenuTree(invalidate, menuId) }
  )

  const updateProduto = useSecureTenantMutation(
    async (
      { token },
      vars: { produtoId: string; input: UpdateMenuProdutoInput }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      const response = await fetchGestorApi(
        `/api/menus/${menuId}/produtos/${vars.produtoId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(vars.input),
        }
      )
      if (!response.ok) await parseError(response, 'Erro ao atualizar produto do menu')
      return (await response.json()).data
    },
    { onSuccess: () => invalidateMenuTree(invalidate, menuId) }
  )

  const reorderProduto = useSecureTenantMutation(
    async (
      { token },
      vars: { produtoId: string; novaPosicao: number }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      const response = await fetchGestorApi(
        `/api/menus/${menuId}/produtos/${vars.produtoId}/reordena-produto`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ novaPosicao: vars.novaPosicao }),
        }
      )
      if (!response.ok) await parseError(response, 'Erro ao reordenar produto')
    },
    { onSuccess: () => invalidate(['menu-produtos', menuId]) }
  )

  const renameGrupo = useSecureTenantMutation(
    async (
      { token },
      vars: { grupoProdutoId: string; nome: string }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      const response = await fetchGestorApi(
        `/api/menus/${menuId}/grupos-produtos/${vars.grupoProdutoId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ nome: vars.nome }),
        }
      )
      if (!response.ok) await parseError(response, 'Erro ao renomear grupo do menu')
      return (await response.json()).data
    },
    { onSuccess: () => invalidate(['menu-grupos', menuId]) }
  )

  const reorderGrupo = useSecureTenantMutation(
    async (
      { token },
      vars: { grupoProdutoId: string; novaPosicao: number }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      const response = await fetchGestorApi(
        `/api/menus/${menuId}/grupos-produtos/${vars.grupoProdutoId}/reordena-grupo`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ novaPosicao: vars.novaPosicao }),
        }
      )
      if (!response.ok) await parseError(response, 'Erro ao reordenar grupo')
    },
    { onSuccess: () => invalidate(['menu-grupos', menuId]) }
  )

  return {
    createMenu,
    updateMenu,
    deleteMenu,
    syncProdutos,
    updateProduto,
    reorderProduto,
    renameGrupo,
    reorderGrupo,
  }
}
