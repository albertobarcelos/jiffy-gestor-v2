'use client'

import { useCallback, useState } from 'react'
import { renomearMenuGrupoViaBffUseCase } from '@/src/application/use-cases/menus/menuBffUseCases'
import { atualizarGrupoProdutoViaBffUseCase } from '@/src/application/use-cases/grupos-produtos/AtualizarGrupoProdutoViaBffUseCase'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useQueryClient } from '@tanstack/react-query'
import { invalidarCatalogoVendaQueries } from '@/src/presentation/cache/catalogoVendaQueryCache'
import { useTenantEmpresaId } from '@/src/presentation/hooks/useTenantQueryKey'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { showToast } from '@/src/shared/utils/toast'

/**
 * Renomeia a categoria neste cardápio (snapshot). Não altera a categoria principal
 * a menos que o usuário escolha copiar para o cadastro base.
 */
export function useRenomearCategoriaNesteCardapio(params: {
  menuId: string
  grupoProdutoId?: string
  produtoId?: string
}) {
  const { menuId, grupoProdutoId, produtoId } = params
  const { renameGrupo } = useMenuMutations(menuId)
  const { pedirConfirmacao, dialog } = usePropagarAlteracaoProduto()
  const invalidate = useInvalidateTenantQueries()
  const queryClient = useQueryClient()
  const empresaId = useTenantEmpresaId()
  const [saving, setSaving] = useState(false)

  const renomear = useCallback(
    async (
      nomeTrim: string,
      override?: { grupoProdutoId?: string; produtoId?: string }
    ): Promise<boolean> => {
      const grupoId = override?.grupoProdutoId ?? grupoProdutoId
      const prodId = override?.produtoId ?? produtoId
      if (!nomeTrim) {
        showToast.error('Informe o nome da categoria neste cardápio')
        return false
      }
      if (!grupoId) {
        showToast.error('Categoria não encontrada neste cardápio')
        return false
      }

      setSaving(true)
      try {
        const destinos = await pedirConfirmacao({
          origem: 'menu',
          produtoId: prodId ?? grupoId,
          menuIdAtual: menuId,
          ...(prodId ? {} : { fonteMenus: 'empresa' as const }),
        })
        if (destinos === null) return false

        const token = useAuthStore.getState().tenantAuth?.getAccessToken()
        if (!token) throw new Error('Token não encontrado')

        await renameGrupo.mutateAsync({
          grupoProdutoId: grupoId,
          nome: nomeTrim,
        })

        for (const outroMenuId of destinos.menuIds) {
          await renomearMenuGrupoViaBffUseCase.execute({
            token,
            menuId: outroMenuId,
            grupoProdutoId: grupoId,
            nome: nomeTrim,
          })
        }
        if (destinos.aplicarNoCadastroBase) {
          await atualizarGrupoProdutoViaBffUseCase.execute({
            token,
            grupoId,
            patch: { nome: nomeTrim },
          })
        }

        await invalidate(['menu-grupos'])
        await invalidate(['menu-produtos'])
        await invalidate(['grupos-produtos'])
        if (prodId) {
          await invalidate(['menu-produto', menuId, prodId])
        }
        invalidarCatalogoVendaQueries(queryClient, empresaId, {
          tipo: 'categoria',
          menuId,
          grupoProdutoId: grupoId,
          produtoId: prodId,
        })

        if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
          showToast.success('Categoria atualizada neste cardápio e nos selecionados')
        } else {
          showToast.success('Categoria atualizada neste cardápio')
        }
        return true
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao salvar categoria')
        return false
      } finally {
        setSaving(false)
      }
    },
    [grupoProdutoId, produtoId, menuId, pedirConfirmacao, renameGrupo, invalidate, queryClient, empresaId]
  )

  return { renomear, saving, dialogPropagacao: dialog }
}
