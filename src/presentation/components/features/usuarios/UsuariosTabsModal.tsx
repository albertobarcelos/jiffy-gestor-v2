'use client'

import { useMemo, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoUsuario } from './NovoUsuario'

type TabKey = 'usuario'

/** ID do form embarcado — deve coincidir com `embeddedFormId` passado ao `NovoUsuario` */
export const USUARIOS_TABS_MODAL_FORM_ID = 'usuarios-tabs-modal-form'

export interface UsuariosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  usuarioId?: string
  initialPerfilPdvId?: string
}

interface UsuariosTabsModalProps {
  state: UsuariosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function UsuariosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: UsuariosTabsModalProps) {
  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const title = useMemo(() => {
    return state.mode === 'edit' ? 'Editar Usuário' : 'Novo Usuário'
  }, [state.mode])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    return {
      barActionOrder: ['cancel', 'save'],
      showCancel: true,
      cancelLabel: 'Fechar',
      onCancel: onClose,
      showSave: true,
      saveLabel: state.mode === 'edit' ? 'Atualizar' : 'Salvar',
      saveFormId: USUARIOS_TABS_MODAL_FORM_ID,
      saveLoading: embedFormState.isSubmitting,
      saveDisabled: !embedFormState.canSubmit || embedFormState.isSubmitting,
    }
  }, [state.mode, embedFormState, onClose])

  return (
    <JiffySidePanelModal
      open={state.open}
      onClose={onClose}
      title={title}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
      footerActions={footerActions}
      tabsSlot={
        <div className="flex flex-wrap gap-1 px-2 pb-0">
          <button
            type="button"
            onClick={() => onTabChange('usuario')}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              state.tab === 'usuario'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            }`}
          >
            Usuário
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {state.tab === 'usuario' ? (
          <NovoUsuario
            usuarioId={state.mode === 'edit' ? state.usuarioId : undefined}
            initialPerfilPdvId={state.initialPerfilPdvId}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={USUARIOS_TABS_MODAL_FORM_ID}
            hideEmbeddedFormActions
            onEmbedFormStateChange={setEmbedFormState}
            onSaved={() => {
              onReload?.()
              onClose()
            }}
            onCancel={onClose}
          />
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
