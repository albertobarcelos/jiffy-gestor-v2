'use client'

import { useMemo, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoUsuario } from '@/src/presentation/components/features/usuarios/NovoUsuario'
import { NovoPerfilUsuario } from './NovoPerfilUsuario'
import { showToast } from '@/src/shared/utils/toast'

const PERFIL_TAB_FORM_ID = 'perfil-usuario-tabs-modal-form'
const USUARIO_TAB_FORM_ID = 'usuario-perfis-tabs-modal-form'

export type PerfisUsuariosTabKey = 'perfil' | 'usuario'

export interface PerfisUsuariosTabsModalState {
  open: boolean
  tab: PerfisUsuariosTabKey
  mode: 'create' | 'edit'
  perfilId?: string
  /** Pré-seleciona perfil PDV na aba Usuário (tem prioridade sobre `perfilId` se ambos existirem) */
  initialPerfilPdvId?: string
  /** Abas Usuário: edição de usuário existente */
  usuarioId?: string
}

interface PerfisUsuariosTabsModalProps {
  state: PerfisUsuariosTabsModalState
  onClose: () => void
  onTabChange: (tab: PerfisUsuariosTabKey) => void
  onReload?: () => void
  /** Salvar perfil embutido: criação devolve id e mantém o modal aberto (tratado no pai) */
  onPerfilEmbeddedSaved?: (payload?: { perfilIdCriado?: string }) => void
}

export function PerfisUsuariosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
  onPerfilEmbeddedSaved,
}: PerfisUsuariosTabsModalProps) {
  const [embedPerfilState, setEmbedPerfilState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })
  const [embedUsuarioState, setEmbedUsuarioState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const title = useMemo(() => {
    if (state.tab === 'usuario') {
      return state.usuarioId ? 'Editar Usuário' : 'Novo Usuário'
    }
    return state.mode === 'create' ? 'Novo Perfil' : 'Editar Perfil'
  }, [state.tab, state.mode, state.usuarioId])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (state.tab === 'usuario') {
      return {
        barActionOrder: ['cancel', 'save'],
        showCancel: true,
        cancelLabel: 'Fechar',
        onCancel: onClose,
        showSave: true,
        saveLabel: state.usuarioId ? 'Atualizar' : 'Salvar',
        saveFormId: USUARIO_TAB_FORM_ID,
        saveLoading: embedUsuarioState.isSubmitting,
        saveDisabled:
          !embedUsuarioState.canSubmit || embedUsuarioState.isSubmitting,
      }
    }
    return {
      barActionOrder: ['cancel', 'save'],
      showCancel: true,
      cancelLabel: 'Fechar',
      onCancel: onClose,
      showSave: true,
      saveLabel: state.mode === 'edit' ? 'Atualizar' : 'Salvar',
      saveFormId: PERFIL_TAB_FORM_ID,
      saveLoading: embedPerfilState.isSubmitting,
      saveDisabled:
        !embedPerfilState.canSubmit || embedPerfilState.isSubmitting,
    }
  }, [
    state.tab,
    state.mode,
    state.usuarioId,
    embedPerfilState,
    embedUsuarioState,
    onClose,
  ])

  const initialPerfilPdvFromContext =
    state.initialPerfilPdvId ?? state.perfilId

  // Novo perfil ainda não persistido: bloqueia aba Usuário até o primeiro salvamento
  const usuarioTabBlocked = state.mode === 'create' && !state.perfilId

  const handleTabClick = (tab: PerfisUsuariosTabKey) => {
    if (tab === 'usuario' && usuarioTabBlocked) {
      showToast.warning('Salve o perfil antes de acessar a aba Usuário.')
      return
    }
    onTabChange(tab)
  }

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
            onClick={() => handleTabClick('perfil')}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              state.tab === 'perfil'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            }`}
          >
            Perfil
          </button>
          <button
            type="button"
            aria-disabled={usuarioTabBlocked}
            title={
              usuarioTabBlocked
                ? 'Salve o perfil para acessar a aba Usuário'
                : undefined
            }
            onClick={() => handleTabClick('usuario')}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
              state.tab === 'usuario'
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
            } ${usuarioTabBlocked ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            Usuário
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {state.tab === 'perfil' ? (
          <NovoPerfilUsuario
            perfilId={state.mode === 'edit' ? state.perfilId : undefined}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={PERFIL_TAB_FORM_ID}
            hideEmbeddedFormActions
            onEmbedFormStateChange={setEmbedPerfilState}
            onSaved={(payload) => {
              if (onPerfilEmbeddedSaved) {
                onPerfilEmbeddedSaved(payload)
                return
              }
              onReload?.()
              if (!payload?.perfilIdCriado) {
                onClose()
              }
            }}
            onCancel={onClose}
          />
        ) : null}
        {state.tab === 'usuario' ? (
          <NovoUsuario
            usuarioId={state.usuarioId}
            initialPerfilPdvId={initialPerfilPdvFromContext}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={USUARIO_TAB_FORM_ID}
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
