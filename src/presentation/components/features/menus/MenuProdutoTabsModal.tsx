'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { cn } from '@/src/shared/utils/cn'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { vincularProdutoMenusComSnapshot } from '@/src/application/use-cases/produtos/VincularProdutoMenusComSnapshotUseCase'
import { MENU_WIDE_PANEL_CLASS } from './menuPanelConstants'
import {
  MenuProdutoSnapshotForm,
  type MenuProdutoSnapshotHandle,
} from './MenuProdutoSnapshotForm'
import {
  MenuGrupoSnapshotForm,
  type MenuGrupoSnapshotHandle,
} from './MenuGrupoSnapshotForm'
import {
  ComplementosMultiSelectDialog,
  type ComplementosMultiSelectHandle,
} from '@/src/presentation/components/features/produtos/ComplementosMultiSelectDialog'
import {
  ProdutoMenusPanel,
  type ProdutoMenusHandle,
} from '@/src/presentation/components/features/produtos/ProdutoMenusPanel'

export type MenuProdutoTabsKey = 'produto' | 'grupo' | 'complementos' | 'menus'

export interface MenuProdutoTabsModalState {
  open: boolean
  tab: MenuProdutoTabsKey
  produto: MenuProduto | null
  grupo: MenuGrupoProduto | null
}

interface MenuProdutoTabsModalProps {
  menuId: string
  state: MenuProdutoTabsModalState
  onClose: () => void
  onTabChange: (tab: MenuProdutoTabsKey) => void
}

export function MenuProdutoTabsModal({
  menuId,
  state,
  onClose,
  onTabChange,
}: MenuProdutoTabsModalProps) {
  const produtoRef = useRef<MenuProdutoSnapshotHandle>(null)
  const grupoRef = useRef<MenuGrupoSnapshotHandle>(null)
  const complementosRef = useRef<ComplementosMultiSelectHandle>(null)
  const menusRef = useRef<ProdutoMenusHandle>(null)
  const invalidate = useInvalidateTenantQueries()

  const [produtoDirty, setProdutoDirty] = useState(false)
  const [grupoDirty, setGrupoDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [embedComplementos, setEmbedComplementos] = useState({
    isDirty: false,
    isSaving: false,
  })
  const [embedMenus, setEmbedMenus] = useState({
    isDirty: false,
    isSaving: false,
  })

  const handleEmbedComplementosChange = useCallback(
    (next: { isDirty: boolean; isSaving: boolean }) => {
      setEmbedComplementos(prev =>
        prev.isDirty === next.isDirty && prev.isSaving === next.isSaving ? prev : next
      )
    },
    []
  )

  const handleEmbedMenusChange = useCallback(
    (next: { isDirty: boolean; isSaving: boolean }) => {
      setEmbedMenus(prev =>
        prev.isDirty === next.isDirty && prev.isSaving === next.isSaving ? prev : next
      )
    },
    []
  )

  const persistMenusFromSnapshot = useCallback(
    async (diff: { add: string[]; remove: string[] }) => {
      const produto = state.produto
      if (!produto) throw new Error('Produto não informado')
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) throw new Error('Token não encontrado')
      const add = diff.add.filter(id => id !== menuId)
      const remove = diff.remove.filter(id => id !== menuId)
      await vincularProdutoMenusComSnapshot({
        token,
        produtoId: produto.produtoId,
        add,
        remove,
        menuOrigemId: menuId,
      })
      await invalidate(['produto', produto.produtoId])
      await invalidate(['menus'])
      await invalidate(['menu'])
      await invalidate(['menu-produtos'])
      await invalidate(['menu-grupos'])
      await invalidate(['menu-produto'])
    },
    [state.produto, menuId, invalidate]
  )

  const title = useMemo(() => {
    const nome = state.produto?.nome || state.grupo?.nome || 'Cardápio'
    return (
      <span className="block max-w-full truncate tracking-normal" title={nome}>
        {nome}
      </span>
    )
  }, [state.produto, state.grupo])

  const handleSave = useCallback(async () => {
    let ok = false
    if (state.tab === 'produto') ok = (await produtoRef.current?.save()) ?? false
    else if (state.tab === 'grupo') ok = (await grupoRef.current?.save()) ?? false
    else if (state.tab === 'menus') ok = (await menusRef.current?.save()) ?? false
    else ok = (await complementosRef.current?.save()) ?? false
    if (ok) onClose()
  }, [state.tab, onClose])

  const currentDirty =
    state.tab === 'produto'
      ? produtoDirty
      : state.tab === 'grupo'
        ? grupoDirty
        : state.tab === 'menus'
          ? embedMenus.isDirty
          : embedComplementos.isDirty
  const currentSaving =
    state.tab === 'complementos'
      ? embedComplementos.isSaving
      : state.tab === 'menus'
        ? embedMenus.isSaving
        : saving

  const footerActions: JiffySidePanelFooterActions = {
    showCancel: true,
    cancelLabel: 'Fechar',
    cancelVariant: 'primaryTint10',
    onCancel: onClose,
    showSave: true,
    saveLabel: 'Salvar e fechar',
    onSave: () => void handleSave(),
    saveLoading: currentSaving,
    saveDisabled: !currentDirty || currentSaving,
  }

  const produtoEnabled = Boolean(state.produto)
  const grupoEnabled = Boolean(state.grupo)
  const complementosEnabled = Boolean(state.produto)

  return (
    <JiffySidePanelModal
      open={state.open}
      onClose={onClose}
      title={title}
      subtitle={<span className="font-normal text-secondary-text">Neste cardápio</span>}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_WIDE_PANEL_CLASS}
      footerActions={footerActions}
      tabsSlot={
        <div className="flex flex-wrap gap-1 px-2 pb-0">
          {(
            [
              { key: 'produto' as const, label: 'Produto', disabled: !produtoEnabled },
              { key: 'grupo' as const, label: 'Categoria', disabled: !grupoEnabled },
              {
                key: 'complementos' as const,
                label: 'Complementos',
                disabled: !complementosEnabled,
              },
              { key: 'menus' as const, label: 'Menus', disabled: !produtoEnabled },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              type="button"
              disabled={tab.disabled}
              onClick={() => !tab.disabled && onTabChange(tab.key)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                state.tab === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              } ${tab.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-1 flex-col">
        {state.produto ? (
          <div
            className={cn(
              'flex h-full min-h-0 flex-1 flex-col overflow-hidden',
              state.tab !== 'produto' && 'hidden'
            )}
            aria-hidden={state.tab !== 'produto'}
          >
            <MenuProdutoSnapshotForm
              ref={produtoRef}
              menuId={menuId}
              produto={state.produto}
              onDirtyChange={setProdutoDirty}
              onSavingChange={setSaving}
            />
          </div>
        ) : null}

        {state.grupo ? (
          <div
            className={cn(
              'flex h-full min-h-0 flex-1 flex-col overflow-hidden',
              state.tab !== 'grupo' && 'hidden'
            )}
            aria-hidden={state.tab !== 'grupo'}
          >
            <MenuGrupoSnapshotForm
              ref={grupoRef}
              menuId={menuId}
              grupo={state.grupo}
              onDirtyChange={setGrupoDirty}
              onSavingChange={setSaving}
            />
          </div>
        ) : null}

        {state.produto ? (
          <div
            className={cn(
              'flex h-full min-h-0 flex-1 flex-col overflow-hidden',
              state.tab !== 'complementos' && 'hidden'
            )}
            aria-hidden={state.tab !== 'complementos'}
          >
            <ComplementosMultiSelectDialog
              ref={complementosRef}
              open={state.open}
              produtoId={state.produto.produtoId}
              produtoNome={state.produto.nome}
              initialGruposResumo={state.produto.gruposComplementos}
              menuId={menuId}
              onClose={onClose}
              isEmbedded
              onEmbedStateChange={handleEmbedComplementosChange}
            />
          </div>
        ) : null}

        {state.produto ? (
          <div
            className={cn(
              'flex h-full min-h-0 flex-1 flex-col overflow-hidden',
              state.tab !== 'menus' && 'hidden'
            )}
            aria-hidden={state.tab !== 'menus'}
          >
            <ProdutoMenusPanel
              ref={menusRef}
              produtoId={state.produto.produtoId}
              persistChanges
              isEmbedded
              lockedMenuIds={[menuId]}
              onPersist={persistMenusFromSnapshot}
              onEmbedStateChange={handleEmbedMenusChange}
              description="Marque outros cardápios para incluir este produto com os dados deste. Ao ativar um vínculo, ele é salvo na hora e a expansão já mostra os dados. Ao editar e salvar, você pode copiar as alterações para outros menus ou para o cadastro base."
            />
          </div>
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
