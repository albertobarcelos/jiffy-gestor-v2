'use client'

import { useMemo, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoCliente } from './NovoCliente'
import { VisualizarCliente } from './VisualizarCliente'

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

  const handleEdit = () => {
    onTabChange('cliente')
  }

  const title = useMemo(() => {
    if (state.tab === 'visualizar') return 'Visualizar Cliente'
    if (state.mode === 'create') return 'Novo Cliente'
    return 'Editar Cliente'
  }, [state.tab, state.mode])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (state.tab === 'visualizar') {
      return {
        barActionOrder: ['cancel', 'save'],
        showCancel: true,
        cancelLabel: 'Fechar',
        onCancel: onClose,
        showSave: true,
        saveLabel: 'Editar',
        onSave: handleEdit,
      }
    }

    return {
      barActionOrder: ['cancel', 'save'],
      showCancel: true,
      cancelLabel: 'Fechar',
      onCancel: onClose,
      showSave: true,
      saveLabel: state.mode === 'edit' ? 'Atualizar' : 'Salvar',
      saveFormId: CLIENTE_TABS_FORM_ID,
      saveLoading: embedFormState.isSubmitting,
      saveDisabled: !embedFormState.canSubmit || embedFormState.isSubmitting,
    }
  }, [state.tab, state.mode, embedFormState, onClose, handleEdit])

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
              onClick={() => !tab.disabled && onTabChange(tab.key)}
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
            clienteId={state.mode === 'create' ? undefined : clienteId}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={CLIENTE_TABS_FORM_ID}
            hideEmbeddedFormActions
            onEmbedFormStateChange={setEmbedFormState}
            onClose={onClose}
            onSaved={() => {
              onReload?.()
              onClose()
            }}
          />
        ) : null}
        {state.tab === 'visualizar' && clienteId ? (
          <VisualizarCliente
            clienteId={clienteId}
            isEmbedded
            hideEmbeddedHeader
            onClose={onClose}
            onEdit={handleEdit}
          />
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}

