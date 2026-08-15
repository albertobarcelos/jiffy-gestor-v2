'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { cn } from '@/src/shared/utils/cn'
import type { MenuGrupoProduto, MenuProduto } from '@/src/shared/types/menus'
import { MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'
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

export type MenuProdutoTabsKey = 'produto' | 'grupo' | 'complementos'

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

  const [produtoDirty, setProdutoDirty] = useState(false)
  const [grupoDirty, setGrupoDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [embedComplementos, setEmbedComplementos] = useState({
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
    else ok = (await complementosRef.current?.save()) ?? false
    if (ok) onClose()
  }, [state.tab, onClose])

  const currentDirty =
    state.tab === 'produto'
      ? produtoDirty
      : state.tab === 'grupo'
        ? grupoDirty
        : embedComplementos.isDirty
  const currentSaving = state.tab === 'complementos' ? embedComplementos.isSaving : saving

  const footerActions: JiffySidePanelFooterActions = {
    showCancel: true,
    cancelLabel: 'Fechar',
    cancelVariant: 'primaryTint10',
    onCancel: onClose,
    showSave: true,
    saveLabel: 'Salvar',
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
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerActions={footerActions}
      tabsSlot={
        <div className="flex flex-wrap gap-1 px-2 pb-0">
          {(
            [
              { key: 'produto' as const, label: 'Produto', disabled: !produtoEnabled },
              { key: 'grupo' as const, label: 'Grupo', disabled: !grupoEnabled },
              {
                key: 'complementos' as const,
                label: 'Complementos',
                disabled: !complementosEnabled,
              },
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
      <div className="flex min-h-0 flex-1 flex-col">
        {state.produto ? (
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden',
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
              'flex min-h-0 flex-1 flex-col overflow-hidden',
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
              'flex min-h-0 flex-1 flex-col overflow-hidden',
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
      </div>
    </JiffySidePanelModal>
  )
}
