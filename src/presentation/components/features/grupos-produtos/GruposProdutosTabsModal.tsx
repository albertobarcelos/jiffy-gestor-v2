'use client'

import { useEffect, useMemo, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoGrupo } from './NovoGrupo'
import { GRUPO_PRODUTOS_MODAL_FORM_ID } from './grupoProdutosModalConstants'

type TabKey = 'grupo'

export interface GruposProdutosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  grupoId?: string
  initialTab?: number // 0 = Detalhes do Grupo, 1 = Produtos Vinculados
}

interface GruposProdutosTabsModalProps {
  state: GruposProdutosTabsModalState
  onClose: () => void
  onReload?: () => void
  onTabChange?: (tab: TabKey) => void
}

export function GruposProdutosTabsModal({
  state,
  onClose,
  onReload,
}: GruposProdutosTabsModalProps) {
  const grupoId = state.grupoId
  const [grupoNome, setGrupoNome] = useState('')

  const title = useMemo(() => {
    return state.mode === 'create'
      ? 'Novo Grupo de Produtos'
      : 'Editar Grupo de Produtos'
  }, [state.mode])

  const subtitle = useMemo(() => {
    if (state.mode !== 'edit') return null
    const nome = grupoNome.trim()
    if (!nome) return null
    return <span className="text-base font-medium normal-case"># {nome}</span>
  }, [state.mode, grupoNome])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const [embedSubTab, setEmbedSubTab] = useState(state.initialTab ?? 0)

  useEffect(() => {
    if (!state.open) return
    setEmbedSubTab(state.initialTab ?? 0)
  }, [state.open, state.initialTab])

  const footerActions =
    embedSubTab === 0
      ? {
          showSave: true,
          saveLabel: state.mode === 'edit' ? 'Atualizar' : 'Salvar',
          saveFormId: GRUPO_PRODUTOS_MODAL_FORM_ID,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting,
        }
      : {
          showSave: true,
          saveLabel: 'Fechar',
          onSave: onClose,
        }

  return (
    <JiffySidePanelModal
      open={state.open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
      footerActions={footerActions}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <NovoGrupo
          key={`grupo-${grupoId || 'new'}-tab-${state.initialTab ?? 0}`}
          grupoId={state.mode === 'create' ? undefined : grupoId}
          isEmbedded
          embeddedFormId={GRUPO_PRODUTOS_MODAL_FORM_ID}
          hideEmbeddedFormActions
          onGrupoNomeChange={setGrupoNome}
          onEmbedFormStateChange={setEmbedFormState}
          onEmbeddedTabChange={setEmbedSubTab}
          onClose={onClose}
          onSaved={() => {
            onReload?.()
            onClose()
          }}
          initialTab={state.initialTab}
        />
      </div>
    </JiffySidePanelModal>
  )
}
