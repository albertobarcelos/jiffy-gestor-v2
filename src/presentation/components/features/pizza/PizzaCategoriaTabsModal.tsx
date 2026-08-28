'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useSecureTenantMutation } from '@/src/presentation/hooks/useSecureTenantMutation'
import { carregarPizzaCategoriaEdicao } from '@/src/presentation/utils/pizza/carregarPizzaCategoriaEdicao'
import { salvarPizzaCategoriaEdicao } from '@/src/presentation/utils/pizza/salvarPizzaCategoriaEdicao'
import {
  serializePizzaEditDraft,
  type PizzaCategoriaEditDraft,
  type PizzaLinhaComplementoEditDraft,
  type PizzaTamanhoEditDraft,
} from '@/src/presentation/utils/pizza/pizzaEditMappers'
import { PizzaCategoriaEditTabs, type PizzaCategoriaEditTabId } from './PizzaCategoriaEditTabs'
import { PizzaCategoriaDetalhesTab } from './PizzaCategoriaDetalhesTab'
import { PizzaTamanhoCards } from './PizzaTamanhoCards'
import { PizzaMassaBordaTable } from './PizzaMassaBordaTable'
import { PizzaCategoriaMenusPanel } from './PizzaCategoriaMenusPanel'

interface PizzaCategoriaTabsModalProps {
  open: boolean
  categoriaId: string | null
  onClose: () => void
  onSuccess?: () => void
}

export function PizzaCategoriaTabsModal({
  open,
  categoriaId,
  onClose,
  onSuccess,
}: PizzaCategoriaTabsModalProps) {
  const invalidate = useInvalidateTenantQueries()
  const [tab, setTab] = useState<PizzaCategoriaEditTabId>('detalhes')
  const [draft, setDraft] = useState<PizzaCategoriaEditDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const baselineRef = useRef('')
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [panelSession, setPanelSession] = useState(0)
  const prevOpenRef = useRef(false)

  const salvarMutation = useSecureTenantMutation<void, PizzaCategoriaEditDraft>(
    async ({ token }, input) => {
      await salvarPizzaCategoriaEdicao(token, input)
    },
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )

  useEffect(() => {
    if (open && !prevOpenRef.current && categoriaId) {
      setPanelSession(s => s + 1)
      setTab('detalhes')
    }
    prevOpenRef.current = open
  }, [open, categoriaId])

  useEffect(() => {
    if (!open || !categoriaId) {
      setDraft(null)
      setLoadError(null)
      return
    }

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    let cancelled = false
    setLoading(true)
    setLoadError(null)

    carregarPizzaCategoriaEdicao(token, categoriaId)
      .then(loaded => {
        if (cancelled) return
        setDraft(loaded)
        baselineRef.current = serializePizzaEditDraft(loaded)
      })
      .catch(error => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'Erro ao carregar categoria')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, categoriaId, panelSession])

  const isDirty = useMemo(() => {
    if (!draft) return false
    return serializePizzaEditDraft(draft) !== baselineRef.current
  }, [draft])

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setConfirmExitOpen(true)
      return
    }
    onClose()
  }, [isDirty, onClose])

  const handleSalvar = useCallback(async () => {
    if (!draft) return
    try {
      await salvarMutation.mutateAsync(draft)
      baselineRef.current = serializePizzaEditDraft(draft)
      showToast.success('Categoria atualizada')
      onSuccess?.()
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria')
    }
  }, [draft, onClose, onSuccess, salvarMutation])

  const handleRemoverTamanho = useCallback((tamanho: PizzaTamanhoEditDraft) => {
    setDraft(prev => {
      if (!prev) return prev
      const next = {
        ...prev,
        tamanhos: prev.tamanhos.filter(t => t.localId !== tamanho.localId),
        tamanhosRemovidosIds: tamanho.id
          ? [...prev.tamanhosRemovidosIds, tamanho.id]
          : prev.tamanhosRemovidosIds,
      }
      return next
    })
  }, [])

  const handleRemoverMassa = useCallback((linha: PizzaLinhaComplementoEditDraft) => {
    setDraft(prev => {
      if (!prev) return prev
      return {
        ...prev,
        massas: prev.massas.filter(m => m.localId !== linha.localId),
        massasRemovidasIds: linha.id
          ? [...prev.massasRemovidasIds, linha.id]
          : prev.massasRemovidasIds,
      }
    })
  }, [])

  const handleRemoverBorda = useCallback((linha: PizzaLinhaComplementoEditDraft) => {
    setDraft(prev => {
      if (!prev) return prev
      return {
        ...prev,
        bordas: prev.bordas.filter(b => b.localId !== linha.localId),
        bordasRemovidasIds: linha.id
          ? [...prev.bordasRemovidasIds, linha.id]
          : prev.bordasRemovidasIds,
      }
    })
  }, [])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (tab === 'cardapios') {
      return {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'dangerOutline',
        onCancel: handleRequestClose,
        barSecondaryTone: 'primary',
      }
    }

    return {
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'dangerOutline',
      onCancel: handleRequestClose,
      showSave: true,
      saveLabel: 'Salvar',
      saveLoading: salvarMutation.isPending,
      saveDisabled: salvarMutation.isPending || loading || !draft,
      onSave: () => void handleSalvar(),
      barSecondaryTone: 'primary',
      barActionOrder: ['cancel', 'save'],
    }
  }, [draft, handleRequestClose, handleSalvar, loading, salvarMutation.isPending, tab])

  return (
    <>
      <JiffySidePanelModal
        open={open}
        onClose={handleRequestClose}
        title={draft?.nome?.trim() || 'Editar categoria pizza'}
        subtitle={
          <span className="font-normal text-secondary-text">Detalhes da categoria</span>
        }
        panelClassName={MENU_WIDE_PANEL_CLASS}
        footerVariant="bar"
        footerActions={footerActions}
      >
        <div key={panelSession} className="flex min-h-0 flex-1 flex-col">
          {loading ? (
            <JiffyLoading text="Carregando categoria..." />
          ) : loadError ? (
            <div className="p-6 text-center text-sm text-error">{loadError}</div>
          ) : draft ? (
            <>
              <PizzaCategoriaEditTabs active={tab} onChange={setTab} />
              {tab === 'detalhes' ? (
                <>
                  <PizzaCategoriaDetalhesTab
                    draft={draft}
                    onChange={next => setDraft({ ...draft, ...next })}
                  />
                  <p className="px-4 pb-4 text-xs text-secondary-text md:px-6">
                    A regra meio a meio só pode ser alterada quando o backend expuser PATCH de
                    configuração.
                  </p>
                </>
              ) : null}
              {tab === 'tamanhos' ? (
                <PizzaTamanhoCards
                  tamanhos={draft.tamanhos}
                  onChange={tamanhos => setDraft({ ...draft, tamanhos })}
                  onRemover={handleRemoverTamanho}
                />
              ) : null}
              {tab === 'massas' ? (
                <PizzaMassaBordaTable
                  labelNome="Massa"
                  labelAdicionar="+ Adicionar massa"
                  linhas={draft.massas}
                  onChange={massas => setDraft({ ...draft, massas })}
                  onRemover={handleRemoverMassa}
                />
              ) : null}
              {tab === 'bordas' ? (
                <PizzaMassaBordaTable
                  labelNome="Borda"
                  labelAdicionar="+ Adicionar borda"
                  linhas={draft.bordas}
                  onChange={bordas => setDraft({ ...draft, bordas })}
                  onRemover={handleRemoverBorda}
                />
              ) : null}
              {tab === 'cardapios' && categoriaId ? (
                <PizzaCategoriaMenusPanel
                  categoriaId={categoriaId}
                  categoriaNome={draft.nome}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </JiffySidePanelModal>

      {confirmExitOpen
        ? createPortal(
            <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 p-4">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-semibold text-primary-text">Alterações não salvas</h3>
                <p className="mt-2 text-sm text-secondary-text">
                  Você tem alterações nesta categoria. Deseja sair sem salvar?
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                    onClick={() => setConfirmExitOpen(false)}
                  >
                    Continuar editando
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white"
                    onClick={() => {
                      setConfirmExitOpen(false)
                      onClose()
                    }}
                  >
                    Sair sem salvar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  )
}
