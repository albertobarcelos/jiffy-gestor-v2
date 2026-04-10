'use client'

import { useMemo, useState } from 'react'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import { NovoGrupoComplemento } from './NovoGrupoComplemento'
import { GrupoComplementoComplementosModal } from './GrupoComplementoComplementosModal'

const GRUPO_TABS_FORM_ID = 'grupos-complemento-tabs-modal-form'

type TabKey = 'grupo' | 'complementos'

export interface GruposComplementosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit'
  grupo?: GrupoComplemento
}

interface GruposComplementosTabsModalProps {
  state: GruposComplementosTabsModalState
  onClose: () => void
  onTabChange: (tab: TabKey) => void
  onReload?: () => void
}

export function GruposComplementosTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
}: GruposComplementosTabsModalProps) {
  const grupoId = state.grupo?.getId()

  const title = useMemo(() => {
    return state.mode === 'create'
      ? 'Novo Grupo de Complementos'
      : 'Editar Grupo de Complementos'
  }, [state.mode])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const footerActions =
    state.tab === 'grupo'
      ? {
          showSave: true,
          saveLabel: state.mode === 'edit' ? 'Atualizar' : 'Salvar',
          saveFormId: GRUPO_TABS_FORM_ID,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting,
        }
      : state.tab === 'complementos'
        ? {
            showSave: true,
            saveLabel: 'Fechar',
            onSave: onClose,
          }
        : undefined

  return (
    <JiffySidePanelModal
      open={state.open}
      onClose={onClose}
      title={title}
      scrollableBody={false}
      footerVariant="bar"
      panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,60vw)]"
      footerActions={footerActions}
      tabsSlot={
        <div className="flex flex-wrap gap-1 px-2 pb-0">
          {(
            [
              { key: 'grupo' as const, label: 'Grupo', disabled: false },
              {
                key: 'complementos' as const,
                label: 'Complementos',
                disabled: !grupoId,
              },
            ] as const
          ).map((tab) => (
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
        {/* Mantém montado ao trocar de aba — evita remount e novo GET em NovoGrupoComplemento */}
        <div
          className={
            state.tab === 'grupo'
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'hidden'
          }
          aria-hidden={state.tab !== 'grupo'}
        >
          <NovoGrupoComplemento
            grupoId={state.mode === 'create' ? undefined : grupoId}
            isEmbedded
            embeddedFormId={GRUPO_TABS_FORM_ID}
            hideEmbeddedFormActions
            onEmbedFormStateChange={setEmbedFormState}
            onClose={onClose}
            onGoToComplementosTab={() => onTabChange('complementos')}
            onSaved={() => {
              onReload?.()
              onClose()
            }}
          />
        </div>

        <div
          className={
            state.tab === 'complementos'
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'hidden'
          }
          aria-hidden={state.tab !== 'complementos'}
        >
          {grupoId && state.grupo ? (
            <GrupoComplementoComplementosModal
              isEmbedded
              grupo={state.grupo}
              onClose={onClose}
              onUpdated={onReload}
            />
          ) : (
            <div className="flex h-full flex-1 items-center justify-center text-sm text-secondary-text">
              Selecione um grupo válido para gerenciar complementos.
            </div>
          )}
        </div>
      </div>
    </JiffySidePanelModal>
  )
}
