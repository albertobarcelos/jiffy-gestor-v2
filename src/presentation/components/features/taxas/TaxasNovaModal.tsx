'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovaTaxa, type NovaTaxaHandle } from '@/src/presentation/components/features/taxas/NovaTaxa'

const NOVA_TAXA_FORM_ID = 'nova-taxa-modal-form'

interface TaxasNovaModalProps {
  open: boolean
  /** ID da taxa para GET/PATCH; ausente = cadastro novo. */
  taxaEditId?: string
  onClose: () => void
  onReload?: () => void
}

/**
 * Painel lateral para criar taxa — mesmo fluxo visual de ComplementosTabsModal (slide + rodapé Salvar).
 */
export function TaxasNovaModal({ open, taxaEditId, onClose, onReload }: TaxasNovaModalProps) {
  const ref = useRef<NovaTaxaHandle>(null)

  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [formSession, setFormSession] = useState(0)
  const prevAbertoRef = useRef(false)

  useEffect(() => {
    if (open && !prevAbertoRef.current) {
      setFormSession(s => s + 1)
    }
    prevAbertoRef.current = open
  }, [open])

  const handleRequestClose = useCallback(() => {
    if (ref.current?.isDirty?.()) {
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
    void ref.current?.saveNovaTaxaAndClose?.()
  }, [])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    return {
      showSave: true,
      saveLabel: 'Salvar',
      saveFormId: NOVA_TAXA_FORM_ID,
      saveLoading: embedFormState.isSubmitting,
      saveDisabled: !embedFormState.canSubmit || embedFormState.isSubmitting,
    }
  }, [embedFormState.canSubmit, embedFormState.isSubmitting])

  return (
    <>
      <JiffySidePanelModal
        open={open}
        onClose={handleRequestClose}
        title={taxaEditId ? 'Editar taxa' : 'Nova taxa'}
        scrollableBody={false}
        footerVariant="bar"
        panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
        footerActions={footerActions}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <NovaTaxa
            ref={ref}
            key={`nova-taxa-sess-${formSession}-${taxaEditId ?? 'novo'}`}
            taxaEditId={taxaEditId ?? null}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={NOVA_TAXA_FORM_ID}
            hideEmbeddedFormActions
            onEmbedFormStateChange={setEmbedFormState}
            onSaved={() => {
              onReload?.()
              onClose()
            }}
            onCancel={handleRequestClose}
          />
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
                aria-labelledby="nova-taxa-exit-title"
              >
                <h3
                  id="nova-taxa-exit-title"
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
