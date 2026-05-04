'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { GrupoComplemento } from '@/src/domain/entities/GrupoComplemento'
import {
  NovoGrupoComplemento,
  type NovoGrupoComplementoBasicData,
  type NovoGrupoComplementoHandle,
} from './NovoGrupoComplemento'
import { GrupoComplementoComplementosModal } from './GrupoComplementoComplementosModal'

const GRUPO_TABS_FORM_ID = 'grupos-complemento-tabs-modal-form'
const INITIAL_BASIC_DATA: NovoGrupoComplementoBasicData = {
  nome: '',
  qtdMinima: '0',
  qtdMaxima: '0',
  ativo: true,
}

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
  const ngcRef = useRef<NovoGrupoComplementoHandle>(null)

  /** Confirmação ao fechar com alterações não salvas no formulário do grupo (PADRAO_MODAL_SAIR_SEM_SALVAR). */
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

  /**
   * Incrementa a cada abertura do painel (open: false → true) para remontar o formulário
   * e não herdar baseline/alterações da sessão anterior após "Sair sem salvar".
   */
  const [grupoComplementoFormSession, setGrupoComplementoFormSession] = useState(0)
  const prevPainelAbertoRef = useRef(false)
  const [draftComplementosIds, setDraftComplementosIds] = useState<string[]>([])
  const [basicData, setBasicData] = useState<NovoGrupoComplementoBasicData>(INITIAL_BASIC_DATA)

  useEffect(() => {
    if (state.open && !prevPainelAbertoRef.current) {
      setGrupoComplementoFormSession(s => s + 1)
      setDraftComplementosIds([])
      setBasicData(INITIAL_BASIC_DATA)
    }
    if (!state.open) {
      setDraftComplementosIds([])
      setBasicData(INITIAL_BASIC_DATA)
    }
    prevPainelAbertoRef.current = state.open
  }, [state.open])

  const handleRequestClose = useCallback(() => {
    if (ngcRef.current?.isDirty?.()) {
      setConfirmExitOpen(true)
      return
    }
    onClose()
  }, [onClose])

  const handleConfirmDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
    onClose()
  }, [onClose])

  const handleCancelDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
  }, [])

  const handleSaveAndCloseFromConfirm = useCallback(() => {
    setConfirmExitOpen(false)
    void ngcRef.current?.saveGrupoComplementoAndClose?.()
  }, [])

  /** Salva dados do grupo (formulário na aba oculta) sem fechar o painel — rodapé na aba Complementos. */
  const handleSalvarGrupoAbaComplementos = useCallback(() => {
    if (state.mode === 'create') {
      void ngcRef.current?.saveGrupoComplementoAndClose?.()
      return
    }
    void ngcRef.current?.saveGrupoComplemento?.()
  }, [state.mode])

  const goToComplementosTab = useCallback(() => {
    onTabChange('complementos')
  }, [onTabChange])

  const title = useMemo(() => {
    return state.mode === 'create'
      ? 'Novo Grupo de Complementos'
      : 'Editar Grupo de Complementos'
  }, [state.mode])

  const [embedFormState, setEmbedFormState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  const createSemComplementos =
    state.mode === 'create' && draftComplementosIds.length === 0

  const footerActions =
    state.tab === 'grupo'
      ? {
          showSave: true,
          saveLabel: 'Salvar',
          saveFormId: GRUPO_TABS_FORM_ID,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting || createSemComplementos,
        }
      : state.tab === 'complementos'
        ? {
            showCancel: true,
            cancelLabel: 'Fechar',
            cancelVariant: 'primaryTint10' as const,
            onCancel: handleRequestClose,
            showSave: true,
            saveLabel: 'Salvar',
            onSave: handleSalvarGrupoAbaComplementos,
            saveLoading: embedFormState.isSubmitting,
            saveDisabled:
              !embedFormState.canSubmit || embedFormState.isSubmitting || createSemComplementos,
          }
        : undefined

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
            {(
              [
                { key: 'grupo' as const, label: 'Grupo', disabled: false },
                {
                  key: 'complementos' as const,
                  label: 'Complementos',
                  disabled: false,
                },
              ] as const
            ).map(tab => (
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
              ref={ngcRef}
              key={`grupo-comp-${grupoId ?? 'new'}-sess-${grupoComplementoFormSession}`}
              grupoId={state.mode === 'create' ? undefined : grupoId}
              isEmbedded
              embeddedFormId={GRUPO_TABS_FORM_ID}
              hideEmbeddedFormActions
              onEmbedFormStateChange={setEmbedFormState}
              onClose={handleRequestClose}
              onReload={onReload}
              complementosIdsDraft={draftComplementosIds}
              onBasicDataChange={setBasicData}
              onGoToComplementosTab={goToComplementosTab}
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
            <GrupoComplementoComplementosModal
              isEmbedded
              mode={state.mode === 'create' ? 'draft' : 'persisted'}
              grupo={state.grupo}
              draftGrupoNome={basicData.nome.trim() || 'Novo grupo'}
              draftLinkedIds={draftComplementosIds}
              onDraftLinkedIdsChange={setDraftComplementosIds}
              onClose={handleRequestClose}
              onUpdated={onReload}
            />
          </div>
        </div>
      </JiffySidePanelModal>

      {confirmExitOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 md:p-4"
              role="presentation"
            >
              <div
                className="w-[85vw] max-w-[85vw] rounded-lg bg-white p-6 shadow-lg md:w-auto md:max-w-md"
                role="dialog"
                aria-modal="true"
                aria-labelledby="grupos-complementos-tabs-exit-title"
              >
                <h3
                  id="grupos-complementos-tabs-exit-title"
                  className="mb-4 text-lg font-semibold text-primary-text"
                >
                  Alterações não salvas
                </h3>
                <p className="mb-6 text-sm text-secondary-text">
                  Você pode salvar antes de sair ou descartar as alterações nos dados do
                  grupo.
                </p>
                <div className="flex flex-col justify-between mb-2 sm:flex-row sm:flex-wrap sm:justify-between">
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
