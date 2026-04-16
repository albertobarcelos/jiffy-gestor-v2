'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoComplemento, type NovoComplementoHandle } from './NovoComplemento'

const COMPLEMENTO_TABS_FORM_ID = 'complemento-tabs-modal-form'

type TabKey = 'complemento'

export interface ComplementosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  complementoId?: string
}

interface ComplementosTabsModalProps {
  state: ComplementosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function ComplementosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: ComplementosTabsModalProps) {
  const ncRef = useRef<NovoComplementoHandle>(null)

  /** Confirmação ao fechar com alterações não salvas (PADRAO_MODAL_SAIR_SEM_SALVAR). */
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

  /**
   * Incrementa a cada abertura do painel (open: false → true) para remontar o formulário
   * e não herdar baseline/alterações da sessão anterior após "Sair sem salvar".
   */
  const [complementoFormSession, setComplementoFormSession] = useState(0)
  const prevPainelAbertoRef = useRef(false)

  useEffect(() => {
    if (state.open && !prevPainelAbertoRef.current) {
      setComplementoFormSession(s => s + 1)
    }
    prevPainelAbertoRef.current = state.open
  }, [state.open])

  const handleRequestClose = useCallback(() => {
    if (ncRef.current?.isDirty?.()) {
      setConfirmExitOpen(true)
      return
    }
    onClose()
  }, [onClose])

  const handleConfirmDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
    onClose()
  }, [onClose])

  const handleCancelDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
  }, [])

  const handleSaveAndCloseFromConfirm = useCallback(() => {
    setConfirmExitOpen(false)
    void ncRef.current?.saveComplementoAndClose?.()
  }, [])

  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Complemento' : 'Editar Complemento'
  }, [state.mode])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  return (
    <>
      <JiffySidePanelModal
        open={state.open}
        onClose={handleRequestClose}
        title={title}
        scrollableBody={false}
        footerVariant="bar"
        panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
        footerActions={{
          showSave: true,
          saveLabel: 'Salvar',
          saveFormId: COMPLEMENTO_TABS_FORM_ID,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled: !embedFormState.canSubmit || embedFormState.isSubmitting,
        }}
        tabsSlot={
          <div className="flex flex-wrap gap-1 px-2 pb-0">
            <button
              type="button"
              onClick={() => onTabChange('complemento')}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                state.tab === 'complemento'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              }`}
            >
              Complemento
            </button>
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {state.tab === 'complemento' ? (
            <NovoComplemento
              ref={ncRef}
              key={`complemento-${state.complementoId ?? 'new'}-sess-${complementoFormSession}`}
              complementoId={state.mode === 'edit' ? state.complementoId : undefined}
              isEmbedded
              hideEmbeddedHeader
              embeddedFormId={COMPLEMENTO_TABS_FORM_ID}
              hideEmbeddedFormActions
              onEmbedFormStateChange={setEmbedFormState}
              onSaved={() => {
                onReload?.()
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
              className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 md:p-4"
              role="presentation"
            >
              <div
                className="w-[85vw] max-w-[85vw] rounded-lg bg-white p-6 shadow-lg md:w-auto md:max-w-md"
                role="dialog"
                aria-modal="true"
                aria-labelledby="complementos-tabs-exit-title"
              >
                <h3
                  id="complementos-tabs-exit-title"
                  className="mb-4 text-lg font-semibold text-primary-text"
                >
                  Alterações não salvas
                </h3>
                <p className="mb-6 text-sm text-secondary-text">
                  Você pode salvar antes de sair ou descartar as alterações.
                </p>
                <div className="flex flex-col justify-between mb-2 sm:flex-row sm:flex-wrap sm:justify-between">
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
