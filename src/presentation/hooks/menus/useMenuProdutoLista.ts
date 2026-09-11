'use client'

import { useCallback, useState } from 'react'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { mensagemSucessoPatchMenu } from '@/src/presentation/hooks/menus/menuProdutoListaMensagens'
import { useProdutosCodigoPorId } from '@/src/presentation/hooks/produtos/useProdutosCodigoPorId'
import { usePropagarAlteracaoProduto } from '@/src/presentation/hooks/produtos/usePropagarAlteracaoProduto'
import { useProdutoPatchMutation } from '@/src/presentation/hooks/useProdutoPatchMutation'
import { showToast } from '@/src/shared/utils/toast'
import type { MenuProduto, UpdateMenuProdutoInput } from '@/src/shared/types/menus'
import type { SnapshotProdutoPropagavel } from '@/src/shared/types/propagarAlteracaoProduto'
import {
  PERMISSOES_GRAVAM_NO_SNAPSHOT_MENU,
  type MenuProdutoPermissaoField,
} from '@/src/shared/utils/menuProdutoPermissoes'

export type StatusConfirmLista = { produtoId: string; ativo: boolean }

export type MenuProdutoListaSaving = {
  nome: boolean
  valor: boolean
  status: boolean
  acoes: boolean
}

interface UseMenuProdutoListaParams {
  menuId: string
  produtosDoMenu: MenuProduto[]
  onProdutoRemovido?: (produtoId: string) => void
}

/**
 * Ações da lista do cardápio: nome, preço, pausa, ícones rápidos e exclusão.
 * O editor só orquestra chrome, filtros e agrupamento.
 */
export function useMenuProdutoLista({
  menuId,
  produtosDoMenu,
  onProdutoRemovido,
}: UseMenuProdutoListaParams) {
  const { syncProdutos, updateProduto } = useMenuMutations(menuId)
  const { codigoPorId, permissoesPorId } = useProdutosCodigoPorId()
  const produtoPatch = useProdutoPatchMutation()
  const { pedirConfirmacao, aplicarNosDestinos, dialog: dialogPropagacao } =
    usePropagarAlteracaoProduto()

  const [statusConfirm, setStatusConfirm] = useState<StatusConfirmLista | null>(null)
  const [statusConfirmSaving, setStatusConfirmSaving] = useState(false)

  const persistirSnapshot = useCallback(
    async (produtoId: string, input: UpdateMenuProdutoInput): Promise<boolean> => {
      const destinos = await pedirConfirmacao({
        origem: 'menu',
        produtoId,
        menuIdAtual: menuId,
      })
      if (destinos === null) return false
      try {
        await updateProduto.mutateAsync({ produtoId, input })
        if (destinos.aplicarNoCadastroBase || destinos.menuIds.length > 0) {
          await aplicarNosDestinos({
            produtoId,
            snapshot: input as SnapshotProdutoPropagavel,
            destinos,
          })
        }
        showToast.success(mensagemSucessoPatchMenu(input))
        return true
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar produto')
        return false
      }
    },
    [aplicarNosDestinos, menuId, pedirConfirmacao, updateProduto]
  )

  const handleNomeChange = useCallback(
    (produtoId: string, nome: string) => persistirSnapshot(produtoId, { nome }),
    [persistirSnapshot]
  )

  const handleValorChange = useCallback(
    (produtoId: string, valor: number) => persistirSnapshot(produtoId, { valor }),
    [persistirSnapshot]
  )

  const handleQuickPatch = useCallback(
    (produtoId: string, input: UpdateMenuProdutoInput) => persistirSnapshot(produtoId, input),
    [persistirSnapshot]
  )

  const handleStatusToggle = useCallback((produtoId: string, ativo: boolean) => {
    setStatusConfirm({ produtoId, ativo })
  }, [])

  const fecharStatusConfirm = useCallback(() => {
    if (!statusConfirmSaving) setStatusConfirm(null)
  }, [statusConfirmSaving])

  const confirmStatusToggle = useCallback(async () => {
    if (!statusConfirm) return
    const { produtoId, ativo } = statusConfirm
    setStatusConfirmSaving(true)
    try {
      await updateProduto.mutateAsync({ produtoId, input: { ativo } })
      showToast.success(
        ativo ? 'Produto disponível neste cardápio' : 'Produto pausado neste cardápio'
      )
      setStatusConfirm(null)
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar status')
    } finally {
      setStatusConfirmSaving(false)
    }
  }, [statusConfirm, updateProduto])

  const handleTogglePermissao = useCallback(
    async (
      produtoId: string,
      field: MenuProdutoPermissaoField,
      value: boolean
    ): Promise<boolean> => {
      if (PERMISSOES_GRAVAM_NO_SNAPSHOT_MENU) {
        return persistirSnapshot(produtoId, { [field]: value })
      }
      try {
        await produtoPatch.mutateAsync({
          type: 'toggle',
          produtoId,
          field,
          novoValor: value,
        })
        return true
      } catch {
        return false
      }
    },
    [persistirSnapshot, produtoPatch]
  )

  const handleRemove = useCallback(
    (produtoId: string) => {
      const produto = produtosDoMenu.find(item => item.produtoId === produtoId)
      if (!produto) return
      if (!window.confirm(`Remover "${produto.nome}" deste cardápio?`)) return
      void syncProdutos
        .mutateAsync({ remove: [produto.produtoId] })
        .then(() => {
          showToast.success('Produto removido deste cardápio')
          onProdutoRemovido?.(produto.produtoId)
        })
        .catch(err =>
          showToast.error(err instanceof Error ? err.message : 'Erro ao remover')
        )
    },
    [onProdutoRemovido, produtosDoMenu, syncProdutos]
  )

  const savingDaLinha = useCallback(
    (produtoId: string): MenuProdutoListaSaving => {
      const savingThis =
        updateProduto.isPending && updateProduto.variables?.produtoId === produtoId
      const input = updateProduto.variables?.input
      const savingPermissao =
        produtoPatch.isPending &&
        produtoPatch.variables?.type === 'toggle' &&
        produtoPatch.variables.produtoId === produtoId
      return {
        nome: Boolean(savingThis && input?.nome !== undefined),
        valor: Boolean(savingThis && input?.valor !== undefined),
        status: Boolean(savingThis && input?.ativo !== undefined),
        acoes: Boolean(savingThis || savingPermissao),
      }
    },
    [
      produtoPatch.isPending,
      produtoPatch.variables,
      updateProduto.isPending,
      updateProduto.variables,
    ]
  )

  return {
    codigoPorId,
    permissoesPorId,
    savingDaLinha,
    handleNomeChange,
    handleValorChange,
    handleQuickPatch,
    handleTogglePermissao,
    handleStatusToggle,
    handleRemove,
    dialogPropagacao,
    statusConfirm,
    statusConfirmSaving,
    confirmStatusToggle,
    fecharStatusConfirm,
  }
}
