'use client'

import { useMemo, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoComplemento } from './NovoComplemento'

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
  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Complemento' : 'Editar Complemento'
  }, [state.mode])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  return (
    <JiffySidePanelModal
      open={state.open}
      onClose={onClose}
      title={title}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
      footerActions={{
        showSave: true,
        saveLabel: state.mode === 'edit' ? 'Atualizar' : 'Salvar',
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
            onCancel={onClose}
          />
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
