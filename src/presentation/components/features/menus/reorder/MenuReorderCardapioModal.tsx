'use client'

import { useCallback } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import {
  MENU_MODAL_CANCEL_VARIANT,
  MENU_WIDE_PANEL_CLASS,
} from '@/src/presentation/components/features/menus/menuPanelConstants'
import { showToast } from '@/src/shared/utils/toast'
import { MenuReorderMillerColumns } from './MenuReorderMillerColumns'
import { useMenuReorderCardapioState } from './useMenuReorderCardapioState'

type MenuReorderCardapioModalProps = {
  open: boolean
  menuId: string
  onClose: () => void
}

export function MenuReorderCardapioModal({ open, menuId, onClose }: MenuReorderCardapioModalProps) {
  const state = useMenuReorderCardapioState(menuId, open)

  const handleCancel = useCallback(() => {
    if (state.isDirty) {
      state.cancelChanges()
    }
    onClose()
  }, [onClose, state])

  const handleSave = useCallback(async () => {
    if (!state.isDirty) {
      onClose()
      return
    }
    try {
      const ok = await state.save()
      if (ok) {
        showToast.success('Ordem do cardápio atualizada')
        onClose()
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar ordem do cardápio')
    }
  }, [onClose, state])

  const footerActions: JiffySidePanelFooterActions = {
    showCancel: true,
    cancelLabel: 'Cancelar',
    cancelVariant: MENU_MODAL_CANCEL_VARIANT,
    onCancel: handleCancel,
    cancelDisabled: state.saving,
    showSave: true,
    saveLabel: 'Salvar',
    onSave: () => void handleSave(),
    saveLoading: state.saving,
    saveDisabled: !state.isDirty || state.saving || state.loadingCatalog,
  }

  return (
    <JiffySidePanelModal
      open={open}
      onClose={handleCancel}
      title="Reordenar cardápio"
      subtitle={
        <span className="font-normal text-secondary-text">
          Para alterar a ordem dos itens ou categorias do seu cardápio, clique na opção desejada,
          segure e arraste.
        </span>
      }
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={`${MENU_WIDE_PANEL_CLASS} !w-[min(1100px,95vw)]`}
      footerActions={footerActions}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col p-2 md:p-4">
        <MenuReorderMillerColumns state={state} />
      </div>
    </JiffySidePanelModal>
  )
}
