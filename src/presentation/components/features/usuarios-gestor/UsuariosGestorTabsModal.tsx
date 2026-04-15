'use client'

import { useMemo, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoUsuarioGestor } from './NovoUsuarioGestor'

const USUARIO_GESTOR_TAB_FORM_ID = 'usuarios-gestor-tabs-modal-form'

export type UsuariosGestorTabKey = 'usuario'

export interface UsuariosGestorTabsModalState {
  open: boolean
  tab: UsuariosGestorTabKey
  mode: 'create' | 'edit'
  usuarioId?: string
  initialPerfilGestorId?: string
}

interface UsuariosGestorTabsModalProps {
  state: UsuariosGestorTabsModalState
  onClose: () => void
  onTabChange: (tab: UsuariosGestorTabKey) => void
  onReload?: () => void
}

export function UsuariosGestorTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: UsuariosGestorTabsModalProps) {
  const [embedUsuarioState, setEmbedUsuarioState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Usuário Gestor' : 'Editar Usuário Gestor'
  }, [state.mode])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    return {
      barActionOrder: ['cancel', 'save'],
      showCancel: true,
      cancelLabel: 'Fechar',
      onCancel: onClose,
      showSave: true,
      saveLabel: state.mode === 'edit' ? 'Atualizar' : 'Salvar',
      saveFormId: USUARIO_GESTOR_TAB_FORM_ID,
      saveLoading: embedUsuarioState.isSubmitting,
      saveDisabled:
        !embedUsuarioState.canSubmit || embedUsuarioState.isSubmitting,
    }
  }, [state.mode, embedUsuarioState, onClose])

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
          <NovoUsuarioGestor
            key={`${state.initialPerfilGestorId ?? ''}-${state.usuarioId ?? 'novo'}`}
            usuarioId={state.mode === 'edit' ? state.usuarioId : undefined}
            initialPerfilGestorId={state.initialPerfilGestorId}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={USUARIO_GESTOR_TAB_FORM_ID}
            hideEmbeddedFormActions
            onEmbedFormStateChange={setEmbedUsuarioState}
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
