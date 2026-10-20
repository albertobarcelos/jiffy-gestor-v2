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
import { MENU_MODAL_CANCEL_VARIANT, MENU_WIDE_PANEL_CLASS } from './menuPanelConstants'
import {
  MenuProdutoSnapshotForm,
  type MenuProdutoSnapshotHandle,
} from './MenuProdutoSnapshotForm'
import {
  ComplementosMultiSelectDialog,
  type ComplementosMultiSelectHandle,
} from '@/src/presentation/components/features/produtos/ComplementosMultiSelectDialog'
import {
  ProdutoMenusPanel,
  type ProdutoMenusHandle,
} from '@/src/presentation/components/features/produtos/ProdutoMenusPanel'

export type MenuProdutoTabsKey = 'produto' | 'complementos' | 'menus'

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
  onGrupoChange?: (grupo: MenuGrupoProduto) => void
  onRemoverDesteCardapio?: (produtoId: string) => void
}

export function MenuProdutoTabsModal({
  menuId,
  state,
  onClose,
  onTabChange,
  onGrupoChange,
  onRemoverDesteCardapio,
}: MenuProdutoTabsModalProps) {
  const produtoRef = useRef<MenuProdutoSnapshotHandle>(null)
  const complementosRef = useRef<ComplementosMultiSelectHandle>(null)
  const menusRef = useRef<ProdutoMenusHandle>(null)
  const invalidate = useInvalidateTenantQueries()

  const [produtoDirty, setProdutoDirty] = useState(false)
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

  const salvandoRef = useRef(false)
  const [acaoSalvar, setAcaoSalvar] = useState<'ficar' | 'fechar' | null>(null)

  const salvarAbaAtual = useCallback(async () => {
    if (state.tab === 'produto') return (await produtoRef.current?.save()) ?? false
    if (state.tab === 'menus') return (await menusRef.current?.save()) ?? false
    return (await complementosRef.current?.save()) ?? false
  }, [state.tab])

  const executarSalvar = useCallback(
    async (fechar: boolean) => {
      if (salvandoRef.current) return
      salvandoRef.current = true
      setAcaoSalvar(fechar ? 'fechar' : 'ficar')
      try {
        const ok = await salvarAbaAtual()
        if (ok && fechar) onClose()
      } finally {
        salvandoRef.current = false
        setAcaoSalvar(null)
      }
    },
    [onClose, salvarAbaAtual]
  )

  const currentDirty =
    state.tab === 'produto'
      ? produtoDirty
      : state.tab === 'menus'
        ? embedMenus.isDirty
        : embedComplementos.isDirty
  const currentSaving =
    state.tab === 'complementos'
      ? embedComplementos.isSaving
      : state.tab === 'menus'
        ? embedMenus.isSaving
        : saving

  const naAbaComplementos = state.tab === 'complementos'
  const ocupado = currentSaving || acaoSalvar !== null
  const footerActions: JiffySidePanelFooterActions = naAbaComplementos
    ? {
        barActionOrder: ['cancel', 'save', 'saveAndClose'],
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: MENU_MODAL_CANCEL_VARIANT,
        onCancel: onClose,
        showSave: true,
        saveBarVariant: 'primaryMuted',
        saveLabel: 'Salvar',
        onSave: () => void executarSalvar(false),
        saveLoading: acaoSalvar === 'ficar',
        saveDisabled: !currentDirty || ocupado,
        showSaveAndClose: true,
        saveAndCloseLabel: 'Salvar e fechar',
        onSaveAndClose: () => void executarSalvar(true),
        saveAndCloseLoading: acaoSalvar === 'fechar',
        saveAndCloseDisabled: !currentDirty || ocupado,
      }
    : {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: MENU_MODAL_CANCEL_VARIANT,
        onCancel: onClose,
        showSave: true,
        saveLabel: 'Salvar e fechar',
        onSave: () => void executarSalvar(true),
        saveLoading: currentSaving || acaoSalvar === 'fechar',
        saveDisabled: !currentDirty || ocupado,
      }

  const produtoEnabled = Boolean(state.produto)
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
              grupo={state.grupo}
              onDirtyChange={setProdutoDirty}
              onSavingChange={setSaving}
              onGrupoChange={onGrupoChange}
              onRemoverDesteCardapio={
                onRemoverDesteCardapio
                  ? () => {
                      const produtoId = state.produto?.produtoId
                      if (produtoId) onRemoverDesteCardapio(produtoId)
                    }
                  : undefined
              }
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
