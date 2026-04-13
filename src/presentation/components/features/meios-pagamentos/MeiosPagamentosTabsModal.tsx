'use client'

import { useMemo, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoMeioPagamento } from './NovoMeioPagamento'
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
  const title = useMemo(() => {
    return state.mode === 'create' ? 'Novo Meio de Pagamento' : 'Editar Meio de Pagamento'
  }, [state.mode])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const meioPagamentoId = state.meioPagamentoId

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
    <JiffySidePanelModal
      open={state.open}
      onClose={onClose}
      title={title}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
      tabsSlot={tabsSlot}
      footerActions={{
        showSave: true,
        saveLabel: 'Salvar',
        saveFormId: MEIO_PAGAMENTO_TABS_MODAL_FORM_ID,
        saveLoading: embedFormState.isSubmitting,
        saveDisabled: !embedFormState.canSubmit || embedFormState.isSubmitting,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {state.tab === 'meio-pagamento' ? (
          <NovoMeioPagamento
            key={`meio-${meioPagamentoId ?? 'new'}-${state.mode}`}
            meioPagamentoId={state.mode === 'edit' ? meioPagamentoId : undefined}
            isEmbedded
            hideEmbeddedHeader
            embeddedFormId={MEIO_PAGAMENTO_TABS_MODAL_FORM_ID}
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
