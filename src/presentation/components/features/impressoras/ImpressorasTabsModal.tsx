'use client'

import { useMemo, useRef, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
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
  const handleRequestCloseRef = useRef<(() => void) | null>(null)

  const [embedState, setEmbedState] = useState({
    canSave: false,
    isSubmitting: false,
  })

  const title = useMemo(() => {
    if (state.mode === 'create') return 'Nova Impressora'
    if (state.mode === 'copy') return 'Copiar Impressora'
    return 'Editar Impressora'
  }, [state.mode])

  const saveLabel = useMemo(() => {
    if (state.mode === 'edit') return 'Salvar'
    return 'Salvar Impressora'
  }, [state.mode])

  const handleModalClose = () => {
    if (handleRequestCloseRef.current) {
      handleRequestCloseRef.current()
    } else {
      onClose()
    }
  }

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
    <JiffySidePanelModal
      open={state.open}
      onClose={handleModalClose}
      title={title}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(960px,45vw)]"
      tabsSlot={tabsSlot}
      footerActions={{
        showSave: true,
        saveLabel,
        onSave: () => void impressoraRef.current?.save(),
        saveLoading: embedState.isSubmitting,
        saveDisabled: !embedState.canSave || embedState.isSubmitting,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <NovaImpressora
          ref={impressoraRef}
          key={`impressora-${impressoraId ?? 'new'}-${state.mode}`}
          impressoraId={state.mode === 'create' ? undefined : impressoraId}
          isCopyMode={state.mode === 'copy'}
          isEmbedded
          hideEmbeddedChrome
          onEmbedChromeStateChange={setEmbedState}
          onClose={onClose}
          onSaved={() => {
            onReload?.()
            onClose()
          }}
          onRequestClose={callback => {
            handleRequestCloseRef.current = callback
          }}
        />
      </div>
    </JiffySidePanelModal>
  )
}
