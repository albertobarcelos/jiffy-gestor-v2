'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoCliente, type NovoClienteHandle } from './NovoCliente'
import { VisualizarCliente } from './VisualizarCliente'
import { showToast } from '@/src/shared/utils/toast'

type TabKey = 'cliente' | 'visualizar'

const CLIENTE_TABS_FORM_ID = 'cliente-tabs-modal-form'

export interface ClientesTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'view'
  clienteId?: string
}

interface ClientesTabsModalProps {
  state: ClientesTabsModalState
  onClose: () => void
  onReload?: () => void
  onTabChange: (tab: TabKey) => void
}

export function ClientesTabsModal({
  state,
  onClose,
  onReload,
  onTabChange,
}: ClientesTabsModalProps) {
  const clienteId = state.clienteId
  const clienteRef = useRef<NovoClienteHandle>(null)

  const handleEdit = useCallback(() => {
    onTabChange('cliente')
  }, [onTabChange])

  const title = useMemo(() => {
    if (state.tab === 'visualizar') return 'Visualizar Cliente'
    if (state.mode === 'create') return 'Novo Cliente'
    return 'Editar Cliente'
  }, [state.tab, state.mode])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  /** Confirmação ao fechar com alterações não salvas (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

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
    if (state.tab !== 'cliente') return false
    return Boolean(clienteRef.current?.isDirty?.())
  }, [state.tab])

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
    void clienteRef.current?.saveClienteAndClose?.()
  }, [])

  const handleTabClick = useCallback(
    (key: TabKey) => {
      if (key === 'visualizar' && state.tab === 'cliente') {
        if (Boolean(clienteRef.current?.isDirty?.())) {
          showToast.warning(
            'Salve ou descarte as alterações na aba Cliente antes de abrir Visualizar.'
          )
          return
        }
      }
      onTabChange(key)
    },
    [onTabChange, state.tab]
  )

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (state.tab === 'visualizar') {
      return {
        barActionOrder: ['cancel', 'save'],
        showCancel: true,
        cancelVariant: 'primaryTint10',
        cancelLabel: 'Fechar',
        onCancel: handleRequestClose,
        showSave: true,
        saveLabel: 'Editar',
        onSave: handleEdit,
      }
    }

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
      saveAndCloseLabel: 'Salvar e fechar',
      onSaveAndClose: () => {
        void clienteRef.current?.saveClienteAndClose?.()
      },
      saveAndCloseLoading: saving,
      saveAndCloseDisabled: disabled,
    }
  }, [state.tab, embedFormState, handleRequestClose, handleEdit])

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
            {[
              { key: 'cliente' as TabKey, label: 'Cliente', disabled: false },
              {
                key: 'visualizar' as TabKey,
                label: 'Visualizar',
                disabled: state.mode === 'create' || !clienteId,
              },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                disabled={tab.disabled}
                onClick={() => !tab.disabled && handleTabClick(tab.key)}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  state.tab === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
                } ${tab.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {state.tab === 'cliente' ? (
            <NovoCliente
              ref={clienteRef}
              key={`cliente-${clienteId ?? 'new'}-${state.mode}-sess-${formSession}`}
              clienteId={state.mode === 'create' ? undefined : clienteId}
              isEmbedded
              hideEmbeddedHeader
              embeddedFormId={CLIENTE_TABS_FORM_ID}
              hideEmbeddedFormActions
              onEmbedFormStateChange={setEmbedFormState}
              onClose={handleRequestClose}
              onSaved={() => {
                onReload?.()
              }}
              onCloseAfterSave={() => {
                onClose()
              }}
            />
          ) : null}
          {state.tab === 'visualizar' && clienteId ? (
            <VisualizarCliente
              clienteId={clienteId}
              isEmbedded
              hideEmbeddedHeader
              onClose={handleRequestClose}
              onEdit={handleEdit}
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
                aria-labelledby="clientes-tabs-modal-exit-title"
              >
                <h3
                  id="clientes-tabs-modal-exit-title"
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
