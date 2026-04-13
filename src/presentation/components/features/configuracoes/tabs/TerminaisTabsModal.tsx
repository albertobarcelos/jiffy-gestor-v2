'use client'

import { useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { EditarTerminais } from './EditarTerminais'
import { TERMINAIS_TABS_MODAL_FORM_ID } from './terminaisTabsModalConstants'

type TabKey = 'terminal'

export interface TerminaisTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'edit'
  terminalId?: string
}

interface TerminaisTabsModalProps {
  state: TerminaisTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function TerminaisTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: TerminaisTabsModalProps) {
  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const terminalId = state.terminalId

  const tabsSlot = (
    <div className="-mx-2 -mt-2 bg-info px-4 md:-mx-4 md:px-6">
      <div className="flex flex-wrap gap-1 pt-2">
        <button
          type="button"
          onClick={() => onTabChange('terminal')}
          className={`font-nunito rounded-t-lg px-4 py-2 text-xs font-semibold md:text-sm ${
            state.tab === 'terminal'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
          }`}
          aria-current={state.tab === 'terminal' ? 'page' : undefined}
        >
          Terminal
        </button>
      </div>
    </div>
  )

  return (
    <JiffySidePanelModal
      open={state.open}
      onClose={onClose}
      title="Editar Terminal"
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
      tabsSlot={tabsSlot}
      footerActions={{
        showSave: true,
        saveLabel: 'Salvar',
        saveFormId: TERMINAIS_TABS_MODAL_FORM_ID,
        saveLoading: embedFormState.isSubmitting,
        saveDisabled: !embedFormState.canSubmit || embedFormState.isSubmitting,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {state.tab === 'terminal' && terminalId ? (
          <EditarTerminais
            key={`terminal-${terminalId}`}
            terminalId={terminalId}
            isEmbedded
            embeddedFormId={TERMINAIS_TABS_MODAL_FORM_ID}
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
