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
  uploadImagemMenuGrupoViaBffUseCase,
} from '@/src/application/use-cases/menus/menuBffUseCases'
import { useQueryClient } from '@tanstack/react-query'
import { invalidarCatalogoVendaQueries } from '@/src/presentation/cache/catalogoVendaQueryCache'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import type {
  CreateMenuInput,
  UpdateMenuInput,
  UpdateMenuProdutoInput,
  UpdateMenuProdutosBatchInput,
} from '@/src/shared/types/menus'

async function invalidateMenuTree(
  invalidate: ReturnType<typeof useInvalidateTenantQueries>,
  queryClient: ReturnType<typeof useQueryClient>,
  empresaId: string | null,
  menuId?: string
) {
  invalidarCatalogoVendaQueries(queryClient, empresaId, { tipo: 'cardapio', menuId })
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
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()

  const createMenu = useSecureTenantMutation(
    async ({ token }, input: CreateMenuInput) =>
      criarMenuViaBffUseCase.execute({ token, data: input }),
    {
      onSuccess: () => {
        invalidarCatalogoVendaQueries(queryClient, empresaId, { tipo: 'cardapio' })
        return invalidate(['menus'])
      },
    }
  )

  const updateMenu = useSecureTenantMutation(
    async ({ token }, vars: { id: string; input: UpdateMenuInput }) =>
      atualizarMenuViaBffUseCase.execute({
        token,
        menuId: vars.id,
        data: vars.input,
      }),
    {
      onSuccess: (_data, vars) =>
        invalidateMenuTree(invalidate, queryClient, empresaId, vars.id),
    }
  )

  const deleteMenu = useSecureTenantMutation(
    async ({ token }, id: string) => excluirMenuViaBffUseCase.execute({ token, menuId: id }),
    {
      onSuccess: () => {
        invalidarCatalogoVendaQueries(queryClient, empresaId, { tipo: 'cardapio' })
        return invalidate(['menus'])
      },
    }
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
    { onSuccess: () => invalidateMenuTree(invalidate, queryClient, empresaId, menuId) }
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
    {
      onSuccess: (_data, vars) => {
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'produto-estrutura',
          produtoId: vars.produtoId,
          menuIds: menuId ? [menuId] : undefined,
        })
        return invalidate(['menu-produtos', menuId])
      },
    }
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
    {
      onSuccess: () => {
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'ordem-produtos',
          menuId,
        })
        return invalidate(['menu-produtos', menuId])
      },
    }
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
    {
      onSuccess: (_data, vars) => {
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'imagem-produto',
          produtoId: vars.produtoId,
          menuIds: menuId ? [menuId] : undefined,
        })
        return invalidate(['menu-produtos', menuId])
      },
    }
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
    {
      onSuccess: (_data, vars) => {
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'categoria',
          menuId,
          grupoProdutoId: vars.grupoProdutoId,
        })
        return invalidate(['menu-grupos', menuId])
      },
    }
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
    {
      onSuccess: () => {
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'ordem-categorias',
          menuId,
        })
        return invalidate(['menu-grupos', menuId])
      },
    }
  )

  const uploadImagemGrupo = useSecureTenantMutation(
    async ({ token }, vars: { grupoProdutoId: string; file: File }) => {
      if (!menuId) throw new Error('menuId é obrigatório')
      return uploadImagemMenuGrupoViaBffUseCase.execute({
        token,
        menuId,
        grupoProdutoId: vars.grupoProdutoId,
        file: vars.file,
      })
    },
    { onSuccess: () => invalidateMenuTree(invalidate, queryClient, empresaId, menuId) }
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
    uploadImagemGrupo,
  }
}
