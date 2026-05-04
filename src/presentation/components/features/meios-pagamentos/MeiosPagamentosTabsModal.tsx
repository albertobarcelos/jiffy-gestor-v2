'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoMeioPagamento, type NovoMeioPagamentoHandle } from './NovoMeioPagamento'
import { MEIO_PAGAMENTO_TABS_MODAL_FORM_ID } from './meioPagamentoModalConstants'

type TabKey = 'meio-pagamento'

export interface MeiosPagamentosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  meioPagamentoId?: string
}

interface MeiosPagamentosTabsModalProps {
  state: MeiosPagamentosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function MeiosPagamentosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: MeiosPagamentosTabsModalProps) {
  const meioRef = useRef<NovoMeioPagamentoHandle>(null)

  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Meio de Pagamento' : 'Editar Meio de Pagamento'
  }, [state.mode])

  const [embedFormState, setEmbedFormState] = useState({
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
    return Boolean(meioRef.current?.isDirty?.())
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

  const handleSaveAndCloseFromConfirm = useCallback(() => {
    setConfirmExitOpen(false)
    void meioRef.current?.saveMeioPagamentoAndClose?.()
  }, [])

  const meioPagamentoId = state.meioPagamentoId

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    const saving = embedFormState.isSubmitting
    const disabled = !embedFormState.canSubmit || embedFormState.isSubmitting
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
        void meioRef.current?.saveMeioPagamentoAndClose?.()
      },
      saveAndCloseLoading: saving,
      saveAndCloseDisabled: disabled,
    }
  }, [embedFormState, handleRequestClose])

  const tabsSlot = (
    <div className="-mx-2 -mt-2 bg-info px-4 md:-mx-4 md:px-6">
      <div className="flex flex-wrap gap-1 pt-2">
        <button
          type="button"
          onClick={() => onTabChange('meio-pagamento')}
          className="font-nunito rounded-t-lg bg-primary px-4 py-2 text-xs font-semibold text-white md:text-sm"
          aria-current="page"
        >
          Meio de Pagamento
        </button>
      </div>
    </div>
  )

  return (
    <>
      <JiffySidePanelModal
        open={state.open}
        onClose={handleRequestClose}
        title={title}
        scrollableBody={false}
        footerVariant="bar"
        panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
        tabsSlot={tabsSlot}
        footerActions={footerActions}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {state.tab === 'meio-pagamento' ? (
            <NovoMeioPagamento
              ref={meioRef}
              key={`meio-${meioPagamentoId ?? 'new'}-${state.mode}-sess-${formSession}`}
              meioPagamentoId={state.mode === 'edit' ? meioPagamentoId : undefined}
              isEmbedded
              hideEmbeddedHeader
              embeddedFormId={MEIO_PAGAMENTO_TABS_MODAL_FORM_ID}
              onEmbedFormStateChange={setEmbedFormState}
              onSaved={() => {
                onReload?.()
              }}
              onCloseAfterSave={() => {
                onClose()
              }}
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
                aria-labelledby="meios-pagamentos-tabs-modal-exit-title"
              >
                <h3
                  id="meios-pagamentos-tabs-modal-exit-title"
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
