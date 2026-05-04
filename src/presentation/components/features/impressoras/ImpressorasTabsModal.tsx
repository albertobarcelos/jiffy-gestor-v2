'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovaImpressora, type NovaImpressoraHandle } from './NovaImpressora'

type TabKey = 'impressora'

export interface ImpressorasTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'copy'
  impressoraId?: string
}

interface ImpressorasTabsModalProps {
  state: ImpressorasTabsModalState
  onClose: () => void
  onReload?: () => void
  /** Reservado para futuras abas; com uma única aba não é chamado. */
  onTabChange?: (tab: TabKey) => void
}

export function ImpressorasTabsModal({ state, onClose, onReload }: ImpressorasTabsModalProps) {
  const impressoraId = state.impressoraId
  const impressoraRef = useRef<NovaImpressoraHandle>(null)

  const [embedState, setEmbedState] = useState({
    canSave: false,
    isSubmitting: false,
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
    return Boolean(impressoraRef.current?.isDirty?.())
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
    void impressoraRef.current?.saveImpressoraAndClose?.()
  }, [])

  const title = useMemo(() => {
    if (state.mode === 'create') return 'Nova Impressora'
    if (state.mode === 'copy') return 'Copiar Impressora'
    return 'Editar Impressora'
  }, [state.mode])

  const saveAndCloseLabel = useMemo(() => {
    if (state.mode === 'edit') return 'Salvar'
    return 'Salvar Impressora'
  }, [state.mode])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    const saving = embedState.isSubmitting
    const disabled = !embedState.canSave || embedState.isSubmitting
    return {
      barActionOrder: ['cancel', 'saveAndClose'],
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      showSave: false,
      showSaveAndClose: true,
      saveAndCloseLabel,
      onSaveAndClose: () => {
        void impressoraRef.current?.saveImpressoraAndClose?.()
      },
      saveAndCloseLoading: saving,
      saveAndCloseDisabled: disabled,
    }
  }, [embedState, handleRequestClose, saveAndCloseLabel])

  const tabsSlot = (
    <div className="-mx-2 -mt-2 bg-info px-4 md:-mx-4 md:px-6">
      <div className="flex flex-wrap gap-1 pt-2">
        <button
          type="button"
          className="font-nunito rounded-t-lg bg-primary px-4 py-2 text-xs font-semibold text-white md:text-sm"
          aria-current="page"
        >
          Impressora
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
        panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(960px,45vw)]"
        tabsSlot={tabsSlot}
        footerActions={footerActions}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <NovaImpressora
            ref={impressoraRef}
            key={`impressora-${impressoraId ?? 'new'}-${state.mode}-sess-${formSession}`}
            impressoraId={state.mode === 'create' ? undefined : impressoraId}
            isCopyMode={state.mode === 'copy'}
            isEmbedded
            hideEmbeddedChrome
            onEmbedChromeStateChange={setEmbedState}
            onSaved={() => {
              onReload?.()
            }}
            onCloseAfterSave={() => {
              onClose()
            }}
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
                aria-labelledby="impressoras-tabs-modal-exit-title"
              >
                <h3
                  id="impressoras-tabs-modal-exit-title"
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
