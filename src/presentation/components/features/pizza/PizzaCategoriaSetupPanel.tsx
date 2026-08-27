'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { showToast } from '@/src/shared/utils/toast'
import { useCriarPizzaCategoriaCompletoMutation } from '@/src/presentation/hooks/pizza/usePizza'
import {
  buildCreateCompletoPayload,
  createDefaultPizzaCategoriaDraft,
  serializePizzaDraft,
  type PizzaCategoriaDraft,
} from './pizzaDefaults'
import {
  nextPizzaSetupTab,
  PizzaSetupTabs,
  prevPizzaSetupTab,
  type PizzaSetupTabId,
} from './PizzaSetupTabs'
import { PizzaCategoriaDetalhesTab } from './PizzaCategoriaDetalhesTab'
import { PizzaTamanhoCards } from './PizzaTamanhoCards'
import { PizzaMassaBordaTable } from './PizzaMassaBordaTable'

interface PizzaCategoriaSetupPanelProps {
  open: boolean
  onClose: () => void
  onSuccess?: (categoriaId: string) => void
  initialNome?: string
}

export function PizzaCategoriaSetupPanel({
  open,
  onClose,
  onSuccess,
  initialNome = '',
}: PizzaCategoriaSetupPanelProps) {
  const [tab, setTab] = useState<PizzaSetupTabId>('detalhes')
  const [draft, setDraft] = useState<PizzaCategoriaDraft>(() =>
    createDefaultPizzaCategoriaDraft(initialNome)
  )
  const baselineRef = useRef(serializePizzaDraft(createDefaultPizzaCategoriaDraft(initialNome)))
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [panelSession, setPanelSession] = useState(0)
  const prevOpenRef = useRef(false)

  const criarMutation = useCriarPizzaCategoriaCompletoMutation()

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const nextDraft = createDefaultPizzaCategoriaDraft(initialNome)
      setDraft(nextDraft)
      baselineRef.current = serializePizzaDraft(nextDraft)
      setTab('detalhes')
      setPanelSession(s => s + 1)
    }
    prevOpenRef.current = open
  }, [open, initialNome])

  const isDirty = useMemo(
    () => serializePizzaDraft(draft) !== baselineRef.current,
    [draft]
  )

  const podeAvancarDetalhes = draft.nome.trim().length > 0
  const podeAvancarTamanhos = draft.tamanhos.some(t => t.nome.trim() && t.ativo)
  const isUltimaAba = tab === 'bordas'

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setConfirmExitOpen(true)
      return
    }
    onClose()
  }, [isDirty, onClose])

  const handleSalvar = useCallback(async () => {
    if (!draft.nome.trim()) {
      showToast.error('Informe o nome da categoria')
      setTab('detalhes')
      return
    }
    if (!draft.tamanhos.some(t => t.nome.trim() && t.ativo)) {
      showToast.error('Informe ao menos um tamanho ativo')
      setTab('tamanhos')
      return
    }

    try {
      const payload = buildCreateCompletoPayload(draft)
      const result = await criarMutation.mutateAsync(payload)
      baselineRef.current = serializePizzaDraft(draft)
      showToast.success('Categoria pizza criada')
      onSuccess?.(result.categoria.id)
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria')
    }
  }, [criarMutation, draft, onClose, onSuccess])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (isUltimaAba) {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'primaryTint10',
        onCancel: handleRequestClose,
        showSave: true,
        saveLabel: 'Salvar',
        saveLoading: criarMutation.isPending,
        saveDisabled: criarMutation.isPending,
        onSave: () => void handleSalvar(),
        barSecondaryTone: 'primaryMuted',
        barActionOrder: ['cancel', 'save'],
      }
    }

    return {
      showPrevious: tab !== 'detalhes',
      previousLabel: 'Anterior',
      onPrevious: () => {
        const prev = prevPizzaSetupTab(tab)
        if (prev) setTab(prev)
      },
      showNext: true,
      nextLabel: 'Continuar',
      nextDisabled:
        (tab === 'detalhes' && !podeAvancarDetalhes) ||
        (tab === 'tamanhos' && !podeAvancarTamanhos),
      onNext: () => {
        const next = nextPizzaSetupTab(tab)
        if (next) setTab(next)
      },
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      barSecondaryTone: 'primaryMuted',
      barActionOrder: ['cancel', 'prev', 'next'],
    }
  }, [
    criarMutation.isPending,
    handleRequestClose,
    handleSalvar,
    isUltimaAba,
    podeAvancarDetalhes,
    podeAvancarTamanhos,
    tab,
  ])

  return (
    <>
      <JiffySidePanelModal
        open={open}
        onClose={handleRequestClose}
        title={draft.nome.trim() || 'Nova categoria pizza'}
        panelClassName={MENU_WIDE_PANEL_CLASS}
        footerVariant="bar"
        footerActions={footerActions}
      >
        <div key={panelSession} className="flex min-h-0 flex-1 flex-col">
          <PizzaSetupTabs active={tab} onChange={setTab} />
          {tab === 'detalhes' ? (
            <PizzaCategoriaDetalhesTab draft={draft} onChange={setDraft} />
          ) : null}
          {tab === 'tamanhos' ? (
            <PizzaTamanhoCards
              tamanhos={draft.tamanhos}
              onChange={tamanhos => setDraft({ ...draft, tamanhos })}
            />
          ) : null}
          {tab === 'massas' ? (
            <PizzaMassaBordaTable
              labelNome="Massa"
              labelAdicionar="+ Adicionar massa"
              linhas={draft.massas}
              onChange={massas => setDraft({ ...draft, massas })}
            />
          ) : null}
          {tab === 'bordas' ? (
            <PizzaMassaBordaTable
              labelNome="Borda"
              labelAdicionar="+ Adicionar borda"
              linhas={draft.bordas}
              onChange={bordas => setDraft({ ...draft, bordas })}
            />
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
