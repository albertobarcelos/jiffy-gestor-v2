'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import {
  NovoPerfilGestor,
  type NovoPerfilGestorHandle,
} from './NovoPerfilGestor'
import {
  NovoUsuarioGestor,
  type NovoUsuarioGestorHandle,
} from '@/src/presentation/components/features/usuarios-gestor/NovoUsuarioGestor'
import { showToast } from '@/src/shared/utils/toast'

const PERFIL_TAB_FORM_ID = 'perfis-gestor-tabs-modal-form'
const USUARIO_TAB_FORM_ID = 'usuario-perfis-gestor-tabs-modal-form'

export type PerfisGestorTabKey = 'perfil' | 'usuario'

export interface PerfisGestorTabsModalState {
  open: boolean
  tab: PerfisGestorTabKey
  mode: 'create' | 'edit'
  perfilId?: string
  /** Aba Usuário: edição de usuário gestor existente */
  usuarioId?: string
}

interface PerfisGestorTabsModalProps {
  state: PerfisGestorTabsModalState
  onClose: () => void
  onTabChange: (tab: PerfisGestorTabKey) => void
  onReload?: () => void
  /** Após criar perfil embutido: atualiza estado no pai com o id persistido (ativa aba Usuário) */
  onPerfilGestorCreated?: (perfilId: string) => void
}

export function PerfisGestorTabsModal({
  state,
  onClose,
  onTabChange,
  onReload,
  onPerfilGestorCreated,
}: PerfisGestorTabsModalProps) {
  const perfilRef = useRef<NovoPerfilGestorHandle>(null)
  const usuarioRef = useRef<NovoUsuarioGestorHandle>(null)

  const [embedPerfilState, setEmbedPerfilState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })
  const [embedUsuarioState, setEmbedUsuarioState] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

  /** Confirmação ao fechar com alterações não salvas (`PADRAO_MODAL_SAIR_SEM_SALVAR`). */
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

  /** Alterações no perfil ainda não salvas — exige Salvar antes da aba Usuário. */
  const [perfilEmbedDirty, setPerfilEmbedDirty] = useState(false)

  const handlePerfilEmbedDirtyChange = useCallback((dirty: boolean) => {
    setPerfilEmbedDirty(dirty)
  }, [])

  /**
   * Incrementa a cada abertura do painel (open: false → true) para remontar os formulários.
   * Evita herdar baseline/alterações da sessão anterior após "Sair sem salvar".
   */
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
      setPerfilEmbedDirty(false)
    }
  }, [state.open])

  const isActiveFormDirty = useCallback(() => {
    if (state.tab === 'perfil') {
      return perfilEmbedDirty || Boolean(perfilRef.current?.isDirty?.())
    }
    return Boolean(usuarioRef.current?.isDirty?.())
  }, [state.tab, perfilEmbedDirty])

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

  /** Salva o formulário da aba ativa e fecha o painel (diálogo de confirmação). */
  const handleSaveAndCloseFromConfirm = useCallback(() => {
    setConfirmExitOpen(false)
    if (state.tab === 'perfil') {
      void perfilRef.current?.savePerfilAndClose?.()
    } else {
      void usuarioRef.current?.saveUsuarioAndClose?.()
    }
  }, [state.tab])

  const title = useMemo(() => {
    if (state.tab === 'usuario') {
      return state.usuarioId ? 'Editar Usuário Gestor' : 'Novo Usuário Gestor'
    }
    return state.mode === 'create' ? 'Novo Perfil Gestor' : 'Editar Perfil Gestor'
  }, [state.tab, state.mode, state.usuarioId])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (state.tab === 'usuario') {
      const savingUsuario = embedUsuarioState.isSubmitting
      const disabledUsuario =
        !embedUsuarioState.canSubmit || embedUsuarioState.isSubmitting
      return {
        barActionOrder: ['cancel', 'save', 'saveAndClose'],
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: handleRequestClose,
        showSave: true,
        saveBarVariant: 'primaryMuted',
        saveLabel: 'Salvar',
        saveFormId: USUARIO_TAB_FORM_ID,
        saveLoading: savingUsuario,
        saveDisabled: disabledUsuario,
        showSaveAndClose: true,
        saveAndCloseLabel: 'Salvar e fechar',
        onSaveAndClose: () => {
          void usuarioRef.current?.saveUsuarioAndClose?.()
        },
        saveAndCloseLoading: false,
        saveAndCloseDisabled: disabledUsuario,
      }
    }
    const savingPerfil = embedPerfilState.isSubmitting
    const disabledPerfil =
      !embedPerfilState.canSubmit || embedPerfilState.isSubmitting
    return {
      barActionOrder: ['cancel', 'save', 'saveAndClose'],
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      showSave: true,
      saveBarVariant: 'primaryMuted',
      saveLabel: 'Salvar',
      saveFormId: PERFIL_TAB_FORM_ID,
      saveLoading: savingPerfil,
      saveDisabled: disabledPerfil,
      showSaveAndClose: true,
      saveAndCloseLabel: 'Salvar e fechar',
      onSaveAndClose: () => {
        void perfilRef.current?.savePerfilAndClose?.()
      },
      saveAndCloseLoading: false,
      saveAndCloseDisabled: disabledPerfil,
    }
  }, [
    state.tab,
    state.mode,
    state.usuarioId,
    embedPerfilState,
    embedUsuarioState,
    handleRequestClose,
  ])

  const initialPerfilGestorFromContext = state.perfilId

  const usuarioTabBlocked = state.mode === 'create' && !state.perfilId

  const usuarioTabDisabled =
    usuarioTabBlocked || (state.tab === 'perfil' && perfilEmbedDirty)

  const handleTabClick = (tab: PerfisGestorTabKey) => {
    if (tab === 'usuario') {
      if (usuarioTabBlocked) {
        showToast.warning('Salve o perfil antes de acessar a aba Usuário.')
        return
      }
      if (state.tab === 'perfil' && perfilEmbedDirty) {
        showToast.warning(
          'Salve as alterações do perfil com o botão Salvar antes de acessar a aba Usuário, para que o cadastro do usuário use os dados atualizados.'
        )
        return
      }
    }
    onTabChange(tab)
  }

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
            <button
              type="button"
              onClick={() => handleTabClick('perfil')}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                state.tab === 'perfil'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              }`}
            >
              Perfil
            </button>
            <button
              type="button"
              aria-disabled={usuarioTabDisabled}
              title={
                usuarioTabBlocked
                  ? 'Salve o perfil para acessar a aba Usuário'
                  : state.tab === 'perfil' && perfilEmbedDirty
                    ? 'Salve as alterações do perfil antes de acessar a aba Usuário'
                    : undefined
              }
              onClick={() => handleTabClick('usuario')}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition-colors ${
                state.tab === 'usuario'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-secondary-text hover:bg-gray-200'
              } ${usuarioTabDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              Usuário
            </button>
          </div>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          {state.tab === 'perfil' ? (
            <NovoPerfilGestor
              ref={perfilRef}
              key={`perfil-gestor-${state.perfilId ?? 'new'}-${state.mode}-sess-${formSession}`}
              perfilId={state.mode === 'edit' ? state.perfilId : undefined}
              isEmbedded
              hideEmbeddedHeader
              embeddedFormId={PERFIL_TAB_FORM_ID}
              hideEmbeddedFormActions
              onEmbedFormStateChange={setEmbedPerfilState}
              onEmbedDirtyChange={handlePerfilEmbedDirtyChange}
              onSaved={(payload) => {
                if (payload?.perfilIdCriado) {
                  onPerfilGestorCreated?.(payload.perfilIdCriado)
                }
                onReload?.()
              }}
              onClosePanelAfterSave={onClose}
              onCancel={handleRequestClose}
            />
          ) : null}
          {state.tab === 'usuario' ? (
            <NovoUsuarioGestor
              ref={usuarioRef}
              key={`usuario-gestor-${state.usuarioId ?? 'new'}-${state.usuarioId ? 'edit' : 'create'}-sess-${formSession}`}
              usuarioId={state.usuarioId}
              initialPerfilGestorId={initialPerfilGestorFromContext}
              isEmbedded
              hideEmbeddedHeader
              embeddedFormId={USUARIO_TAB_FORM_ID}
              hideEmbeddedFormActions
              onEmbedFormStateChange={setEmbedUsuarioState}
              onSaved={() => {
                onReload?.()
              }}
              onCloseAfterSave={() => {
                onClose()
              }}
              onCancel={handleRequestClose}
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
                aria-labelledby="perfis-gestor-tabs-exit-title"
              >
                <h3
                  id="perfis-gestor-tabs-exit-title"
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
