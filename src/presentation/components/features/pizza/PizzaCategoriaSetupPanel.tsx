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
  nextPizzaCategoriaSetupStep,
  PIZZA_CATEGORIA_SETUP_STEPS,
  prevPizzaCategoriaSetupStep,
  PizzaCategoriaSetupStepper,
  type PizzaCategoriaSetupStepId,
} from './PizzaCategoriaSetupStepper'
import { PizzaCategoriaInformacoesStep } from './PizzaCategoriaInformacoesStep'
import { PizzaCategoriaRegraPrecoStep } from './PizzaCategoriaRegraPrecoStep'
import {
  PizzaCategoriaSaboresStep,
  type PizzaCategoriaSaboresStepHandle,
} from './PizzaCategoriaSaboresStep'
import { PizzaCategoriaAdicionaisStep } from './PizzaCategoriaAdicionaisStep'
import { PizzaTamanhoCards } from './PizzaTamanhoCards'
import { PizzaMassaBordaTable } from './PizzaMassaBordaTable'

interface PizzaCategoriaSetupPanelProps {
  open: boolean
  onClose: () => void
  onSuccess?: (categoriaId: string) => void
  initialNome?: string
  /** Quando informado, associa a config da categoria a este cardápio. */
  menuId?: string
}

export function PizzaCategoriaSetupPanel({
  open,
  onClose,
  onSuccess,
  initialNome = '',
  menuId,
}: PizzaCategoriaSetupPanelProps) {
  const [step, setStep] = useState<PizzaCategoriaSetupStepId>('informacoes')
  const [draft, setDraft] = useState<PizzaCategoriaDraft>(() =>
    createDefaultPizzaCategoriaDraft(initialNome)
  )
  const baselineRef = useRef(serializePizzaDraft(createDefaultPizzaCategoriaDraft(initialNome)))
  const saboresStepRef = useRef<PizzaCategoriaSaboresStepHandle>(null)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [panelSession, setPanelSession] = useState(0)
  const prevOpenRef = useRef(false)

  const goToStep = useCallback((next: PizzaCategoriaSetupStepId) => {
    if (step === 'sabores' && next !== 'sabores') {
      const fromIdx = PIZZA_CATEGORIA_SETUP_STEPS.findIndex(item => item.id === step)
      const toIdx = PIZZA_CATEGORIA_SETUP_STEPS.findIndex(item => item.id === next)
      if (toIdx > fromIdx && !(saboresStepRef.current?.tryFlushBeforeLeave() ?? true)) {
        return
      }
    }
    setStep(next)
  }, [step])

  const criarMutation = useCriarPizzaCategoriaCompletoMutation()

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const nextDraft = createDefaultPizzaCategoriaDraft(initialNome)
      setDraft(nextDraft)
      baselineRef.current = serializePizzaDraft(nextDraft)
      setStep('informacoes')
      setPanelSession(s => s + 1)
    }
    prevOpenRef.current = open
  }, [open, initialNome])

  const isDirty = useMemo(
    () => serializePizzaDraft(draft) !== baselineRef.current,
    [draft]
  )

  const podeAvancarInformacoes = draft.nome.trim().length > 0
  const podeAvancarTamanhos = draft.tamanhos.some(t => t.nome.trim() && t.ativo)
  const isUltimoPasso = step === 'adicionais'

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
      setStep('informacoes')
      return
    }
    if (!draft.tamanhos.some(t => t.nome.trim() && t.ativo)) {
      showToast.error('Informe ao menos um tamanho ativo')
      setStep('tamanhos')
      return
    }

    try {
      const payload = buildCreateCompletoPayload(draft, { menuId })
      const result = await criarMutation.mutateAsync(payload)
      baselineRef.current = serializePizzaDraft(draft)
      const partes: string[] = []
      if (draft.sabores.length > 0) partes.push('sabores')
      if (draft.adicionais.length > 0) partes.push('adicionais')
      showToast.success(
        partes.length > 0
          ? `Categoria pizza criada com ${partes.join(' e ')}`
          : menuId
            ? 'Categoria criada. Cadastre sabores para exibir no cardápio.'
            : 'Categoria pizza criada'
      )
      onSuccess?.(result.categoria.id)
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar categoria')
    }
  }, [criarMutation, draft, menuId, onClose, onSuccess])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (isUltimoPasso) {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'dangerOutline',
        onCancel: handleRequestClose,
        showPrevious: true,
        previousLabel: 'Anterior',
        onPrevious: () => {
          const prev = prevPizzaCategoriaSetupStep(step)
          if (prev) goToStep(prev)
        },
        showSave: true,
        saveLabel: 'Salvar',
        saveLoading: criarMutation.isPending,
        saveDisabled: criarMutation.isPending,
        onSave: () => void handleSalvar(),
        barSecondaryTone: 'primary',
        barActionOrder: ['cancel', 'prev', 'save'],
      }
    }

    return {
      showPrevious: step !== 'informacoes',
      previousLabel: 'Anterior',
      onPrevious: () => {
        const prev = prevPizzaCategoriaSetupStep(step)
        if (prev) goToStep(prev)
      },
      showNext: true,
      nextLabel: 'Continuar',
      nextDisabled:
        (step === 'informacoes' && !podeAvancarInformacoes) ||
        (step === 'tamanhos' && !podeAvancarTamanhos),
      onNext: () => {
        const next = nextPizzaCategoriaSetupStep(step)
        if (next) goToStep(next)
      },
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'dangerOutline',
      onCancel: handleRequestClose,
      barSecondaryTone: 'primary',
      barActionOrder: ['cancel', 'prev', 'next'],
    }
  }, [
    criarMutation.isPending,
    goToStep,
    handleRequestClose,
    handleSalvar,
    isUltimoPasso,
    podeAvancarInformacoes,
    podeAvancarTamanhos,
    step,
  ])

  return (
    <>
      <JiffySidePanelModal
        open={open}
        onClose={handleRequestClose}
        title={draft.nome.trim() || 'Nova categoria pizza'}
        subtitle={
          <span className="font-normal text-secondary-text">Detalhes da categoria</span>
        }
        panelClassName={MENU_WIDE_PANEL_CLASS}
        scrollableBody={false}
        footerVariant="bar"
        footerActions={footerActions}
      >
        <div key={panelSession} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PizzaCategoriaSetupStepper className="shrink-0" active={step} onChange={goToStep} />

          {step === 'informacoes' ? (
            <PizzaCategoriaInformacoesStep draft={draft} onChange={setDraft} />
          ) : null}

          {step === 'regra-preco' ? (
            <PizzaCategoriaRegraPrecoStep draft={draft} onChange={setDraft} />
          ) : null}

          {step === 'tamanhos' ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PizzaTamanhoCards
                tamanhos={draft.tamanhos}
                onChange={tamanhos => setDraft({ ...draft, tamanhos })}
                onRemover={tamanho =>
                  setDraft(prev => ({
                    ...prev,
                    tamanhos: prev.tamanhos.filter(t => t.localId !== tamanho.localId),
                    sabores: prev.sabores.map(sabor => {
                      if (!(tamanho.localId in sabor.precosPorTamanhoLocalId)) return sabor
                      const nextPrecos = { ...sabor.precosPorTamanhoLocalId }
                      delete nextPrecos[tamanho.localId]
                      return { ...sabor, precosPorTamanhoLocalId: nextPrecos }
                    }),
                    adicionais: prev.adicionais.map(adicional => {
                      if (!(tamanho.localId in adicional.precosPorTamanhoLocalId)) {
                        return adicional
                      }
                      const nextPrecos = { ...adicional.precosPorTamanhoLocalId }
                      delete nextPrecos[tamanho.localId]
                      return { ...adicional, precosPorTamanhoLocalId: nextPrecos }
                    }),
                  }))
                }
              />
            </div>
          ) : null}

          {step === 'sabores' ? (
            <PizzaCategoriaSaboresStep
              ref={saboresStepRef}
              draft={draft}
              onChange={setDraft}
            />
          ) : null}

          {step === 'massas-bordas' ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 md:p-4">
              <section className="space-y-1.5">
                <div>
                  <h2 className="text-sm font-semibold text-primary-text">Massas</h2>
                  <p className="text-xs text-secondary-text">
                    Cadastre as massas disponíveis nesta categoria.
                  </p>
                </div>
                <PizzaMassaBordaTable
                  className="gap-2 p-0"
                  labelNome="Massa"
                  labelAdicionar="+ Adicionar massa"
                  linhas={draft.massas}
                  onChange={massas => setDraft({ ...draft, massas })}
                />
              </section>
              <section className="space-y-1.5">
                <div>
                  <h2 className="text-sm font-semibold text-primary-text">Bordas</h2>
                  <p className="text-xs text-secondary-text">
                    Cadastre as bordas disponíveis nesta categoria.
                  </p>
                </div>
                <PizzaMassaBordaTable
                  className="gap-2 p-0"
                  labelNome="Borda"
                  labelAdicionar="+ Adicionar borda"
                  linhas={draft.bordas}
                  onChange={bordas => setDraft({ ...draft, bordas })}
                />
              </section>
            </div>
          ) : null}

          {step === 'adicionais' ? (
            <PizzaCategoriaAdicionaisStep draft={draft} onChange={setDraft} />
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
