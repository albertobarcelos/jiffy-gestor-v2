'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { atualizarGrupoProdutoViaBffUseCase } from '@/src/application/use-cases/grupos-produtos/AtualizarGrupoProdutoViaBffUseCase'
import { useMenuGruposProdutos } from '@/src/presentation/hooks/menus/useMenuCatalog'
import { useMenuMutations } from '@/src/presentation/hooks/menus/useMenuMutations'
import { useRenomearCategoriaNesteCardapio } from '@/src/presentation/hooks/menus/useRenomearCategoriaNesteCardapio'
import { useLocaleUppercaseInputHandler } from '@/src/presentation/hooks/useLocaleUppercaseInputHandler'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { showToast } from '@/src/shared/utils/toast'
import type { MenuGrupoProduto } from '@/src/shared/types/menus'
import { coletarGruposMenuPorSnapshot } from '@/src/presentation/components/features/menus/ordenarGruposMenuSnapshot'

type VisualPatch = { corHex?: string; iconName?: string }

/**
 * Orquestra as 3 escritas da categoria no cardápio:
 * - lápis: snapshot do nome neste menu
 * - dropdown: move o produto para outro grupo
 * - ícone: cor/ícone no cadastro base
 */
export function useCategoriaNesteCardapio(params: {
  menuId: string
  grupo: MenuGrupoProduto
  produtoId?: string
  onDirtyChange?: (dirty: boolean) => void
  onSavingChange?: (saving: boolean) => void
  onGrupoChange?: (grupo: MenuGrupoProduto) => void
}) {
  const { menuId, grupo, produtoId, onDirtyChange, onSavingChange, onGrupoChange } = params
  const { updateProduto } = useMenuMutations(menuId)
  const invalidate = useInvalidateTenantQueries()
  const { data: gruposData, isLoading: loadingGrupos } = useMenuGruposProdutos({ menuId })
  const gruposDoMenu = useMemo(
    () => coletarGruposMenuPorSnapshot(gruposData?.pages),
    [gruposData?.pages]
  )

  const [grupoAtual, setGrupoAtual] = useState(grupo)
  const { renomear, saving: savingNome, dialogPropagacao } = useRenomearCategoriaNesteCardapio({
    menuId,
    grupoProdutoId: grupoAtual.grupoBase.id,
    produtoId,
  })
  const [nome, setNome] = useState(grupo.nome)
  const [nomeSalvo, setNomeSalvo] = useState(grupo.nome)
  const [editandoNome, setEditandoNome] = useState(false)
  const [movendo, setMovendo] = useState(false)
  const { inputRef, handleChange: handleNomeChange } = useLocaleUppercaseInputHandler(
    nome,
    setNome
  )

  const persistVisualMutation = useSecureTenantMutation(
    async ({ token }, vars: { grupoId: string; patch: VisualPatch }) => {
      await atualizarGrupoProdutoViaBffUseCase.execute({
        token,
        grupoId: vars.grupoId,
        patch: vars.patch,
      })
    }
  )

  useEffect(() => {
    setGrupoAtual(grupo)
    setNome(grupo.nome)
    setNomeSalvo(grupo.nome)
    setEditandoNome(false)
  }, [grupo])

  const isDirty = useCallback(
    () => nome.trim() !== nomeSalvo.trim(),
    [nome, nomeSalvo]
  )

  const saving = savingNome || movendo || persistVisualMutation.isPending

  useEffect(() => {
    onDirtyChange?.(isDirty())
  }, [isDirty, onDirtyChange])

  useEffect(() => {
    onSavingChange?.(saving)
  }, [saving, onSavingChange])

  useEffect(() => {
    if (!editandoNome) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editandoNome, inputRef])

  const save = useCallback(async () => {
    const nomeTrim = nome.trim()
    if (!nomeTrim) {
      showToast.error('Informe o nome da categoria neste cardápio')
      return false
    }
    if (nomeTrim === nomeSalvo.trim()) {
      setEditandoNome(false)
      return true
    }
    const ok = await renomear(nomeTrim)
    if (ok) {
      setNomeSalvo(nomeTrim)
      setEditandoNome(false)
    }
    return ok
  }, [nome, nomeSalvo, renomear])

  const iniciarEdicaoNome = () => {
    if (saving) return
    setNome(nomeSalvo)
    setEditandoNome(true)
  }

  const cancelarEdicaoNome = () => {
    setNome(nomeSalvo)
    setEditandoNome(false)
  }

  const trocarCategoria = useCallback(
    async (_: unknown, next: MenuGrupoProduto) => {
      if (!produtoId || next.grupoBase.id === grupoAtual.grupoBase.id) return
      setMovendo(true)
      try {
        await updateProduto.mutateAsync({
          produtoId,
          input: { grupoProdutoId: next.grupoBase.id },
        })
        setGrupoAtual(next)
        setNome(next.nome)
        setNomeSalvo(next.nome)
        setEditandoNome(false)
        onGrupoChange?.(next)
        showToast.success('Categoria do produto atualizada neste cardápio')
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao alterar categoria')
      } finally {
        setMovendo(false)
      }
    },
    [produtoId, grupoAtual.grupoBase.id, updateProduto, onGrupoChange]
  )

  const persistVisual = useCallback(
    async (patch: VisualPatch) => {
      try {
        await persistVisualMutation.mutateAsync({
          grupoId: grupoAtual.grupoBase.id,
          patch,
        })
        const next: MenuGrupoProduto = {
          ...grupoAtual,
          grupoBase: {
            ...grupoAtual.grupoBase,
            ...patch,
          },
        }
        setGrupoAtual(next)
        onGrupoChange?.(next)
        await invalidate(['grupos-produtos'])
        await invalidate(['menu-grupos'])
        showToast.success('Categoria atualizada')
      } catch (err) {
        showToast.error(err instanceof Error ? err.message : 'Erro ao atualizar categoria')
      }
    },
    [grupoAtual, invalidate, onGrupoChange, persistVisualMutation]
  )

  return {
    grupoAtual,
    gruposDoMenu,
    loadingGrupos,
    nome,
    nomeSalvo,
    editandoNome,
    saving,
    inputRef,
    handleNomeChange,
    iniciarEdicaoNome,
    cancelarEdicaoNome,
    save,
    isDirty,
    trocarCategoria,
    persistVisual,
    dialogPropagacao,
    corHex: grupoAtual.grupoBase.corHex?.trim() || '#530CA3',
    iconName: grupoAtual.grupoBase.iconName?.trim() || '',
  }
}
