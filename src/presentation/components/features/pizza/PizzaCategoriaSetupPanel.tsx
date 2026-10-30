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
import { useCriarPizzaCategoriaCompletoMutation } from '@/src/presentation/hooks/pizza/usePizza'
import { buildCreateCompletoPayload } from '@/src/application/mappers/pizza/buildCreateCompletoPayload'
import {
  mergeEditDraftFromStepChange,
  serializePizzaEditDraft,
  type PizzaCategoriaEditDraft,
  type PizzaLinhaComplementoEditDraft,
  type PizzaTamanhoEditDraft,
} from '@/src/application/mappers/pizza/pizzaEditMappers'
import {
  carregarEdicaoCategoriaPizzaUseCase,
  salvarEdicaoCategoriaPizzaUseCase,
} from '@/src/infrastructure/composition/pizzaUseCases'
import {
  createDefaultPizzaCategoriaDraft,
  serializePizzaDraft,
  syncDraftPrecosComTamanhos,
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
import {
  aplicarOrdemTamanhosSalva,
  coletarIdsTamanhosOrdenados,
  gravarOrdemTamanhos,
  lerOrdemTamanhos,
} from './pizzaTamanhoOrdemStorage'

type SetupMode = 'create' | 'edit'

interface PizzaCategoriaSetupPanelProps {
  open: boolean
  onClose: () => void
  onSuccess?: (categoriaId: string) => void
  initialNome?: string
  /** Quando informado, associa a config da categoria a este cardápio (somente create). */
  menuId?: string
  mode?: SetupMode
  /** Obrigatório quando mode=edit. */
  categoriaId?: string | null
}

export function PizzaCategoriaSetupPanel({
  open,
  onClose,
  onSuccess,
  initialNome = '',
  menuId,
  mode = 'create',
  categoriaId = null,
}: PizzaCategoriaSetupPanelProps) {
  const isEdit = mode === 'edit'
  const invalidate = useInvalidateTenantQueries()

  const [step, setStep] = useState<PizzaCategoriaSetupStepId>('informacoes')
  const [draft, setDraft] = useState<PizzaCategoriaDraft | PizzaCategoriaEditDraft | null>(null)
  const baselineRef = useRef('')
  const saboresStepRef = useRef<PizzaCategoriaSaboresStepHandle>(null)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [panelSession, setPanelSession] = useState(0)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const prevOpenRef = useRef(false)

  const goToStep = useCallback(
    (next: PizzaCategoriaSetupStepId) => {
      if (step === 'sabores' && next !== 'sabores') {
        const fromIdx = PIZZA_CATEGORIA_SETUP_STEPS.findIndex(item => item.id === step)
        const toIdx = PIZZA_CATEGORIA_SETUP_STEPS.findIndex(item => item.id === next)
        if (toIdx > fromIdx && !(saboresStepRef.current?.tryFlushBeforeLeave() ?? true)) {
          return
        }
      }
      setStep(next)
    },
    [step]
  )

  const criarMutation = useCriarPizzaCategoriaCompletoMutation()
  const salvarEditMutation = useSecureTenantMutation<void, PizzaCategoriaEditDraft>(
    async ({ token }, input) => {
      await salvarEdicaoCategoriaPizzaUseCase.execute({ token, draft: input })
    },
    {
      onSuccess: async () => {
        await invalidate(['pizza'])
      },
    }
  )

  const saving = isEdit ? salvarEditMutation.isPending : criarMutation.isPending

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setStep('informacoes')
      setConfirmExitOpen(false)
      setLoadError(null)
      setPanelSession(s => s + 1)

      if (!isEdit) {
        const nextDraft = createDefaultPizzaCategoriaDraft(initialNome)
        setDraft(nextDraft)
        baselineRef.current = serializePizzaDraft(nextDraft)
      } else {
        setDraft(null)
        baselineRef.current = ''
      }
    }
    prevOpenRef.current = open
  }, [open, initialNome, isEdit])

  useEffect(() => {
    if (!open || !isEdit || !categoriaId) return

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) return

    let cancelled = false
    setLoadingEdit(true)
    setLoadError(null)

    carregarEdicaoCategoriaPizzaUseCase
      .execute({ token, categoriaId })
      .then(loaded => {
        if (cancelled) return
        const tamanhosOrdenados = aplicarOrdemTamanhosSalva(
          loaded.tamanhos,
          lerOrdemTamanhos(loaded.categoriaId)
        )
        const nextDraft = { ...loaded, tamanhos: tamanhosOrdenados }
        setDraft(nextDraft)
        baselineRef.current = serializePizzaEditDraft(nextDraft)
      })
      .catch(error => {
        if (cancelled) return
        setLoadError(error instanceof Error ? error.message : 'Erro ao carregar categoria')
      })
      .finally(() => {
        if (!cancelled) setLoadingEdit(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, isEdit, categoriaId, panelSession])

  const isDirty = useMemo(() => {
    if (!draft) return false
    if (isEdit) {
      return serializePizzaEditDraft(draft as PizzaCategoriaEditDraft) !== baselineRef.current
    }
    return serializePizzaDraft(draft) !== baselineRef.current
  }, [draft, isEdit])

  const applyDraftChange = useCallback(
    (next: PizzaCategoriaDraft) => {
      setDraft(prev => {
        if (!prev) return syncDraftPrecosComTamanhos(next)
        if (isEdit && 'categoriaId' in prev) {
          return mergeEditDraftFromStepChange(prev, syncDraftPrecosComTamanhos(next))
        }
        return syncDraftPrecosComTamanhos(next)
      })
    },
    [isEdit]
  )

  const podeAvancarInformacoes = Boolean(draft?.nome.trim())
  const podeAvancarTamanhos = Boolean(draft?.tamanhos.some(t => t.nome.trim() && t.ativo))
  const isUltimoPasso = step === 'adicionais'

  const handleRequestClose = useCallback(() => {
    if (isDirty) {
      setConfirmExitOpen(true)
      return
    }
    onClose()
  }, [isDirty, onClose])

  const handleRemoverTamanho = useCallback(
    (tamanho: PizzaTamanhoEditDraft | { localId: string; id?: string }) => {
      setDraft(prev => {
        if (!prev) return prev
        const nextTamanhos = prev.tamanhos.filter(t => t.localId !== tamanho.localId)
        const nextSabores = prev.sabores.map(sabor => {
          if (!(tamanho.localId in sabor.precosPorTamanhoLocalId)) return sabor
          const nextPrecos = { ...sabor.precosPorTamanhoLocalId }
          delete nextPrecos[tamanho.localId]
          return { ...sabor, precosPorTamanhoLocalId: nextPrecos }
        })
        const nextAdicionais = prev.adicionais.map(adicional => {
          if (!(tamanho.localId in adicional.precosPorTamanhoLocalId)) return adicional
          const nextPrecos = { ...adicional.precosPorTamanhoLocalId }
          delete nextPrecos[tamanho.localId]
          return { ...adicional, precosPorTamanhoLocalId: nextPrecos }
        })

        if (isEdit && 'categoriaId' in prev) {
          gravarOrdemTamanhos(prev.categoriaId, coletarIdsTamanhosOrdenados(nextTamanhos))
          return {
            ...prev,
            tamanhos: nextTamanhos,
            sabores: nextSabores,
            adicionais: nextAdicionais,
            tamanhosRemovidosIds:
              'id' in tamanho && tamanho.id
                ? [...prev.tamanhosRemovidosIds, tamanho.id]
                : prev.tamanhosRemovidosIds,
          }
        }

        return {
          ...prev,
          tamanhos: nextTamanhos,
          sabores: nextSabores,
          adicionais: nextAdicionais,
        }
      })
    },
    [isEdit]
  )

  const handleRemoverMassa = useCallback(
    (linha: PizzaLinhaComplementoEditDraft) => {
      setDraft(prev => {
        if (!prev || !isEdit || !('categoriaId' in prev)) {
          if (!prev) return prev
          return { ...prev, massas: prev.massas.filter(m => m.localId !== linha.localId) }
        }
        return {
          ...prev,
          massas: prev.massas.filter(m => m.localId !== linha.localId),
          massasRemovidasIds: linha.id
            ? [...prev.massasRemovidasIds, linha.id]
            : prev.massasRemovidasIds,
        }
      })
    },
    [isEdit]
  )

  const handleRemoverBorda = useCallback(
    (linha: PizzaLinhaComplementoEditDraft) => {
      setDraft(prev => {
        if (!prev || !isEdit || !('categoriaId' in prev)) {
          if (!prev) return prev
          return { ...prev, bordas: prev.bordas.filter(b => b.localId !== linha.localId) }
        }
        return {
          ...prev,
          bordas: prev.bordas.filter(b => b.localId !== linha.localId),
          bordasRemovidasIds: linha.id
            ? [...prev.bordasRemovidasIds, linha.id]
            : prev.bordasRemovidasIds,
        }
      })
    },
    [isEdit]
  )

  const handleSalvar = useCallback(async () => {
    if (!draft) return
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
      if (isEdit && 'categoriaId' in draft) {
        await salvarEditMutation.mutateAsync(draft)
        gravarOrdemTamanhos(draft.categoriaId, coletarIdsTamanhosOrdenados(draft.tamanhos))
        baselineRef.current = serializePizzaEditDraft(draft)
        showToast.success('Categoria pizza atualizada')
        onSuccess?.(draft.categoriaId)
        onClose()
        return
      }

      const payload = buildCreateCompletoPayload(draft, { menuId })
      const result = await criarMutation.mutateAsync(payload)
      const idsNaOrdemDoDraft = draft.tamanhos
        .filter(t => t.nome.trim())
        .map(t => {
          const nome = t.nome.trim()
          return result.tamanhos.find(r => r.nome === nome)?.id
        })
        .filter((id): id is string => Boolean(id))
      gravarOrdemTamanhos(result.categoria.id, idsNaOrdemDoDraft)
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
  }, [criarMutation, draft, isEdit, menuId, onClose, onSuccess, salvarEditMutation])

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
        saveLoading: saving,
        saveDisabled: saving || !draft || loadingEdit,
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
        !draft ||
        loadingEdit ||
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
    draft,
    goToStep,
    handleRequestClose,
    handleSalvar,
    isUltimoPasso,
    loadingEdit,
    podeAvancarInformacoes,
    podeAvancarTamanhos,
    saving,
    step,
  ])

  const title =
    draft?.nome?.trim() ||
    (isEdit ? 'Editar categoria pizza' : 'Nova categoria pizza')

  return (
    <>
      <JiffySidePanelModal
        open={open}
        onClose={handleRequestClose}
        title={title}
        subtitle={
          <span className="font-normal text-secondary-text">Detalhes da categoria</span>
        }
        panelClassName={MENU_WIDE_PANEL_CLASS}
        scrollableBody={false}
        footerVariant="bar"
        footerActions={footerActions}
      >
        <div key={panelSession} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {loadingEdit ? (
            <JiffyLoading text="Carregando categoria..." />
          ) : loadError ? (
            <div className="p-6 text-center text-sm text-error">{loadError}</div>
          ) : draft ? (
            <>
              <PizzaCategoriaSetupStepper className="shrink-0" active={step} onChange={goToStep} />

              {step === 'informacoes' ? (
                <PizzaCategoriaInformacoesStep draft={draft} onChange={applyDraftChange} />
              ) : null}

              {step === 'regra-preco' ? (
                <PizzaCategoriaRegraPrecoStep draft={draft} onChange={applyDraftChange} />
              ) : null}

              {step === 'tamanhos' ? (
                <div className="min-h-0 flex-1 overflow-y-auto">
                  <PizzaTamanhoCards
                    tamanhos={draft.tamanhos}
                    onChange={tamanhos => {
                      applyDraftChange({ ...draft, tamanhos })
                      if (isEdit && 'categoriaId' in draft) {
                        gravarOrdemTamanhos(
                          draft.categoriaId,
                          coletarIdsTamanhosOrdenados(tamanhos)
                        )
                      }
                    }}
                    onRemover={handleRemoverTamanho}
                  />
                </div>
              ) : null}

              {step === 'sabores' ? (
                <PizzaCategoriaSaboresStep
                  ref={saboresStepRef}
                  draft={draft}
                  onChange={applyDraftChange}
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
                      onChange={massas => applyDraftChange({ ...draft, massas })}
                      onRemover={handleRemoverMassa}
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
                      onChange={bordas => applyDraftChange({ ...draft, bordas })}
                      onRemover={handleRemoverBorda}
                    />
                  </section>
                </div>
              ) : null}

              {step === 'adicionais' ? (
                <PizzaCategoriaAdicionaisStep draft={draft} onChange={applyDraftChange} />
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
