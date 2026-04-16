'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { JiffySidePanelModal } from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { NovoGrupo, type NovoGrupoHandle } from './NovoGrupo'
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
  const ngRef = useRef<NovoGrupoHandle>(null)
  const [grupoNome, setGrupoNome] = useState('')

  /** Confirmação ao fechar com alterações não salvas (PADRAO_MODAL_SAIR_SEM_SALVAR). */
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

  /**
   * Incrementa a cada abertura do painel (open: false → true) para remontar o `NovoGrupo`.
   * Evita herdar baseline/alterações da sessão anterior após "Sair sem salvar".
   */
  const [grupoFormSession, setGrupoFormSession] = useState(0)
  const prevPainelAbertoRef = useRef(false)

  useEffect(() => {
    if (state.open && !prevPainelAbertoRef.current) {
      setGrupoFormSession(s => s + 1)
    }
    prevPainelAbertoRef.current = state.open
  }, [state.open])

  const handleRequestClose = useCallback(() => {
    if (ngRef.current?.isDirty?.()) {
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

  /** Salva o grupo e fecha o painel (diálogo de confirmação). */
  const handleSaveAndCloseFromConfirm = useCallback(() => {
    setConfirmExitOpen(false)
    void ngRef.current?.saveGrupoAndClose?.()
  }, [])

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

  const handleSalvarGrupoAbaProdutos = useCallback(() => {
    void ngRef.current?.saveGrupo?.()
  }, [])

  const footerActions =
    embedSubTab === 0
      ? {
          showSave: true,
          saveLabel: 'Salvar',
          saveFormId: GRUPO_PRODUTOS_MODAL_FORM_ID,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting,
        }
      : {
          showCancel: true,
          cancelLabel: 'Fechar',
          onCancel: handleRequestClose,
          showSave: true,
          saveLabel: 'Salvar',
          onSave: handleSalvarGrupoAbaProdutos,
          saveLoading: embedFormState.isSubmitting,
          saveDisabled:
            !embedFormState.canSubmit || embedFormState.isSubmitting,
        }

  return (
    <>
      <JiffySidePanelModal
        open={state.open}
        onClose={handleRequestClose}
        title={title}
        subtitle={subtitle}
        scrollableBody={false}
        footerVariant="bar"
        panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
        footerActions={footerActions}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <NovoGrupo
            ref={ngRef}
            key={`grupo-${grupoId || 'new'}-tab-${state.initialTab ?? 0}-sess-${grupoFormSession}`}
            grupoId={state.mode === 'create' ? undefined : grupoId}
            isEmbedded
            embeddedFormId={GRUPO_PRODUTOS_MODAL_FORM_ID}
            hideEmbeddedFormActions
            onGrupoNomeChange={setGrupoNome}
            onEmbedFormStateChange={setEmbedFormState}
            onEmbeddedTabChange={setEmbedSubTab}
            onClose={handleRequestClose}
            onReload={onReload}
            onSaved={() => {
              onReload?.()
              onClose()
            }}
            initialTab={state.initialTab}
          />
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
                aria-labelledby="grupos-produtos-tabs-exit-title"
              >
                <h3
                  id="grupos-produtos-tabs-exit-title"
                  className="mb-4 text-lg font-semibold text-primary-text"
                >
                  Alterações não salvas
                </h3>
                <p className="mb-6 text-sm text-secondary-text">
                  Você pode salvar antes de sair ou descartar as alterações.
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
