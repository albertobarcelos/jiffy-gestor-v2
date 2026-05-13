'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import {
  NovoPerfilGestor,
  type NovoPerfilGestorHandle,
} from './NovoPerfilGestor'

const PERFIL_FORM_ID = 'perfis-gestor-modal-form'

export interface PerfisGestorTabsModalState {
  open: boolean
  mode: 'create' | 'edit'
  perfilId?: string
}

interface PerfisGestorTabsModalProps {
  state: PerfisGestorTabsModalState
  onClose: () => void
  onReload?: () => void
  onPerfilGestorCreated?: (perfilId: string) => void
}

export function PerfisGestorTabsModal({
  state,
  onClose,
  onReload,
  onPerfilGestorCreated,
}: PerfisGestorTabsModalProps) {
  const perfilRef = useRef<NovoPerfilGestorHandle>(null)

  const [embedPerfilState, setEmbedPerfilState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [perfilEmbedDirty, setPerfilEmbedDirty] = useState(false)

  const handlePerfilEmbedDirtyChange = useCallback((dirty: boolean) => {
    setPerfilEmbedDirty(dirty)
  }, [])

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
      setPerfilEmbedDirty(false)
    }
  }, [state.open])

  const isActiveFormDirty = useCallback(() => {
    return perfilEmbedDirty || Boolean(perfilRef.current?.isDirty?.())
  }, [perfilEmbedDirty])

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

  const handleSaveAndCloseFromConfirm = useCallback(() => {
    setConfirmExitOpen(false)
    void perfilRef.current?.savePerfilAndClose?.()
  }, [])

  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Perfil Gestor' : 'Editar Perfil Gestor'
  }, [state.mode])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    const saving = embedPerfilState.isSubmitting
    const disabled = !embedPerfilState.canSubmit || embedPerfilState.isSubmitting
    return {
      barActionOrder: ['cancel', 'save', 'saveAndClose'],
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      showSave: true,
      saveBarVariant: 'primaryMuted',
      saveLabel: 'Salvar',
      saveFormId: PERFIL_FORM_ID,
      saveLoading: saving,
      saveDisabled: disabled,
      showSaveAndClose: true,
      saveAndCloseLabel: 'Salvar e fechar',
      onSaveAndClose: () => {
        void perfilRef.current?.savePerfilAndClose?.()
      },
      saveAndCloseLoading: false,
      saveAndCloseDisabled: disabled,
    }
  }, [embedPerfilState, handleRequestClose])

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
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <NovoPerfilGestor
            ref={perfilRef}
            key={`perfil-gestor-${state.perfilId ?? 'new'}-${state.mode}-sess-${formSession}`}
            perfilId={state.mode === 'edit' ? state.perfilId : undefined}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={PERFIL_FORM_ID}
            hideEmbeddedFormActions
            onEmbedFormStateChange={setEmbedPerfilState}
            onEmbedDirtyChange={handlePerfilEmbedDirtyChange}
            onSaved={(payload) => {
              if (payload?.perfilIdCriado) {
                onPerfilGestorCreated?.(payload.perfilIdCriado)
              }
              onReload?.()
            }}
            onClosePanelAfterSave={onClose}
            onCancel={handleRequestClose}
          />
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
                aria-labelledby="perfis-gestor-exit-title"
              >
                <h3
                  id="perfis-gestor-exit-title"
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
