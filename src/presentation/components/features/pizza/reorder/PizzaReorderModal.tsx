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
import { PizzaReorderMillerColumns } from './PizzaReorderMillerColumns'
import { usePizzaReorderState } from './usePizzaReorderState'

type PizzaReorderModalProps = {
  open: boolean
  onClose: () => void
}

export function PizzaReorderModal({ open, onClose }: PizzaReorderModalProps) {
  const state = usePizzaReorderState(open)

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
        showToast.success('Ordem das pizzas atualizada')
        onClose()
      }
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao salvar ordem das pizzas')
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
      title="Reordenar pizzas"
      subtitle={
        <span className="font-normal text-secondary-text">
          Para alterar a ordem das categorias ou dos sabores, clique na opção desejada, segure e
          arraste.
        </span>
      }
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={`${MENU_WIDE_PANEL_CLASS} !w-[min(760px,95vw)]`}
      footerActions={footerActions}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col p-2 md:p-4">
        <PizzaReorderMillerColumns state={state} />
      </div>
    </JiffySidePanelModal>
  )
}
