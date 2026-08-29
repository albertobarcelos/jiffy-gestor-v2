'use client'

import {
  atualizarMenuProdutoViaBffUseCase,
  atualizarMenuProdutosBatchViaBffUseCase,
  atualizarMenuViaBffUseCase,
  criarMenuViaBffUseCase,
  excluirMenuViaBffUseCase,
  renomearMenuGrupoViaBffUseCase,
  reordenarMenuGrupoViaBffUseCase,
  reordenarMenuProdutoViaBffUseCase,
  uploadImagemMenuProdutoViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import type {
  CreateMenuInput,
  UpdateMenuInput,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'

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
    async ({ token }, input: CreateMenuInput) =>
      criarMenuViaBffUseCase.execute({ token, data: input }),
    { onSuccess: () => invalidate(['menus']) }
  )

  const updateMenu = useSecureTenantMutation(
    async ({ token }, vars: { id: string; input: UpdateMenuInput }) =>
      atualizarMenuViaBffUseCase.execute({
        token,
        menuId: vars.id,
        data: vars.input,
      }),
    { onSuccess: (_data, vars) => invalidateMenuTree(invalidate, vars.id) }
  )

  const deleteMenu = useSecureTenantMutation(
    async ({ token }, id: string) => excluirMenuViaBffUseCase.execute({ token, menuId: id }),
    { onSuccess: () => invalidate(['menus']) }
  )

  const syncProdutos = useSecureTenantMutation(
    async ({ token }, input: UpdateMenuProdutosBatchInput) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      return atualizarMenuProdutosBatchViaBffUseCase.execute({
        token,
        menuId,
        data: input,
      })
    },
    { onSuccess: () => invalidateMenuTree(invalidate, menuId) }
  )

  const updateProduto = useSecureTenantMutation(
    async (
      { token },
      vars: { produtoId: string; input: UpdateMenuProdutoInput }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      return atualizarMenuProdutoViaBffUseCase.execute({
        token,
        menuId,
        produtoId: vars.produtoId,
        data: vars.input,
      })
    },
    { onSuccess: () => invalidateMenuTree(invalidate, menuId) }
  )

  const reorderProduto = useSecureTenantMutation(
    async (
      { token },
      vars: { produtoId: string; novaPosicao: number }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      await reordenarMenuProdutoViaBffUseCase.execute({
        token,
        menuId,
        produtoId: vars.produtoId,
        novaPosicao: vars.novaPosicao,
      })
    },
    { onSuccess: () => invalidate(['menu-produtos', menuId]) }
  )

  const uploadImagemProduto = useSecureTenantMutation(
    async ({ token }, vars: { produtoId: string; file: File }) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      return uploadImagemMenuProdutoViaBffUseCase.execute({
        token,
        menuId,
        produtoId: vars.produtoId,
        file: vars.file,
      })
    },
    { onSuccess: () => invalidateMenuTree(invalidate, menuId) }
  )

  const renameGrupo = useSecureTenantMutation(
    async (
      { token },
      vars: { grupoProdutoId: string; nome: string }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      return renomearMenuGrupoViaBffUseCase.execute({
        token,
        menuId,
        grupoProdutoId: vars.grupoProdutoId,
        nome: vars.nome,
      })
    },
    { onSuccess: () => invalidate(['menu-grupos', menuId]) }
  )

  const reorderGrupo = useSecureTenantMutation(
    async (
      { token },
      vars: { grupoProdutoId: string; novaPosicao: number }
    ) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      await reordenarMenuGrupoViaBffUseCase.execute({
        token,
        menuId,
        grupoProdutoId: vars.grupoProdutoId,
        novaPosicao: vars.novaPosicao,
      })
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
    uploadImagemProduto,
    renameGrupo,
    reorderGrupo,
  }
}
