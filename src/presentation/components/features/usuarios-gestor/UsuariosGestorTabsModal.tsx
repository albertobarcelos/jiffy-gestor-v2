'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoUsuarioGestor, type NovoUsuarioGestorHandle } from './NovoUsuarioGestor'

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
  const usuarioRef = useRef<NovoUsuarioGestorHandle>(null)

  const [embedUsuarioState, setEmbedUsuarioState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  /** Confirmação ao fechar com alterações não salvas (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

  /**
   * Incrementa a cada abertura do painel (open: false → true) para remontar o formulário.
   * Evita herdar baseline/alterações da sessão anterior após "Sair sem salvar".
   */
  const [formSession, setFormSession] = useState(0)
  const prevPainelAbertoRef = useRef(false)

  useEffect(() => {
    if (state.open && !prevPainelAbertoRef.current) {
      setFormSession(s => s + 1)
    }
    prevPainelAbertoRef.current = state.open
  }, [state.open])

  useEffect(() => {
    if (!state.open) {
      setConfirmExitOpen(false)
    }
  }, [state.open])

  const isActiveFormDirty = useCallback(() => {
    return Boolean(usuarioRef.current?.isDirty?.())
  }, [])

  const handleRequestClose = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (isActiveFormDirty()) {
          setConfirmExitOpen(true)
          return
        }
        onClose()
      })
    })
  }, [onClose, isActiveFormDirty])

  const handleConfirmDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
    onClose()
  }, [onClose])

  const handleCancelDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
  }, [])

  /** Salva o formulário e fecha o painel (fluxo a partir do diálogo de confirmação). */
  const handleSaveAndCloseFromConfirm = useCallback(() => {
    setConfirmExitOpen(false)
    void usuarioRef.current?.saveUsuarioAndClose?.()
  }, [])

  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Usuário Gestor' : 'Editar Usuário Gestor'
  }, [state.mode])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    const saving = embedUsuarioState.isSubmitting
    const disabled =
      !embedUsuarioState.canSubmit || embedUsuarioState.isSubmitting
    return {
      barActionOrder: ['cancel', 'saveAndClose'],
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      showSave: false,
      showSaveAndClose: true,
      saveAndCloseLabel: 'Salvar',
      onSaveAndClose: () => {
        void usuarioRef.current?.saveUsuarioAndClose?.()
      },
      saveAndCloseLoading: saving,
      saveAndCloseDisabled: disabled,
    }
  }, [embedUsuarioState, handleRequestClose])

  return (
    <>
      <JiffySidePanelModal
        open={state.open}
        onClose={handleRequestClose}
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
              ref={usuarioRef}
              key={`usuario-gestor-${state.usuarioId ?? 'new'}-${state.mode}-sess-${formSession}`}
              usuarioId={state.mode === 'edit' ? state.usuarioId : undefined}
              initialPerfilGestorId={state.initialPerfilGestorId}
              isEmbedded
              hideEmbeddedHeader
              embeddedFormId={USUARIO_GESTOR_TAB_FORM_ID}
              hideEmbeddedFormActions
              onEmbedFormStateChange={setEmbedUsuarioState}
              onSaved={() => {
                onReload?.()
              }}
              onCloseAfterSave={() => {
                onClose()
              }}
              onCancel={handleRequestClose}
            />
          ) : null}
        </div>
      </JiffySidePanelModal>

      {confirmExitOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/50 md:p-4"
              role="presentation"
            >
              <div
                className="w-[85vw] max-w-[85vw] rounded-lg bg-white p-6 shadow-lg md:w-auto md:max-w-md"
                role="dialog"
                aria-modal="true"
                aria-labelledby="usuarios-gestor-tabs-modal-exit-title"
              >
                <h3
                  id="usuarios-gestor-tabs-modal-exit-title"
                  className="mb-4 text-lg font-semibold text-primary-text"
                >
                  Alterações não salvas
                </h3>
                <p className="mb-6 text-sm text-secondary-text">
                  Você pode salvar antes de sair ou descartar as alterações.
                </p>
                <div className="mb-2 flex flex-col justify-between sm:flex-row sm:flex-wrap sm:justify-between">
                  <button
                    type="button"
                    onClick={handleCancelDiscardExit}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-primary-text transition-colors hover:bg-gray-50"
                  >
                    Continuar editando
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmDiscardExit}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-secondary-text transition-colors hover:bg-gray-50"
                  >
                    Sair sem salvar
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAndCloseFromConfirm}
                  className="w-full rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Salvar e fechar
                </button>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
