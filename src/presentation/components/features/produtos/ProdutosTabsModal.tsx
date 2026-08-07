'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Produto } from '@/src/domain/entities/Produto'
import { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { NovoProduto, type NovoProdutoHandle } from './NovoProduto'
import { ComplementosMultiSelectDialog, type ComplementosMultiSelectHandle } from './ComplementosMultiSelectDialog'
import {
  ProdutoImpressorasDialog,
  type ProdutoImpressorasHandle,
} from './ProdutoImpressorasDialog'
import { ProdutoImagemPanel } from './ProdutoImagemPanel'
import { NovoGrupo, type NovoGrupoHandle } from '../grupos-produtos/NovoGrupo'
import { GRUPO_PRODUTOS_MODAL_FORM_ID } from '../grupos-produtos/grupoProdutosModalConstants'
import { cn } from '@/src/shared/utils/cn'

export type ProdutosTabsModalTab =
  | 'produto'
  | 'complementos'
  | 'impressoras'
  | 'imagem'
  | 'grupo'

type TabKey = ProdutosTabsModalTab

export interface ProdutosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'copy'
  produto?: Produto
  prefillGrupoProdutoId?: string
  grupoId?: string
  /** Grupo já carregado na lista — evita spinner ao abrir a aba Grupo. */
  initialGrupo?: GrupoProduto
  initialStepProduto?: 0 | 1 | 2
  /** Aba inicial do `NovoGrupo` (0 = detalhes, 1 = produtos vinculados) */
  initialTabGrupo?: number
}

interface ProdutosTabsModalProps {
  state: ProdutosTabsModalState
  onClose: () => void
  onReload?: (produtoId?: string, produtoData?: any) => void
  onTabChange: (tab: TabKey) => void
}

export function ProdutosTabsModal({
  state,
  onClose,
  onReload,
  onTabChange,
}: ProdutosTabsModalProps) {
  const produtoId = state.produto?.getId()
  const npRef = useRef<NovoProdutoHandle>(null)
  const grupoNgRef = useRef<NovoGrupoHandle>(null)
  const complementosRef = useRef<ComplementosMultiSelectHandle>(null)
  const impressorasRef = useRef<ProdutoImpressorasHandle>(null)
  /** Evita fechar o painel quando o salvamento do produto é só etapa antes do salvamento do grupo */
  const suppressCloseOnNextProdutoSuccessRef = useRef(false)

  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(state.initialStepProduto ?? 0)
  const [wizardSaving, setWizardSaving] = useState(false)
  const [fiscalOnlyBack, setFiscalOnlyBack] = useState(false)

  const [embedGrupoTab, setEmbedGrupoTab] = useState(state.initialTabGrupo ?? 0)
  const [embedGrupoForm, setEmbedGrupoForm] = useState({
    isSubmitting: false,
    canSubmit: false,
  })
  const [embedComplementos, setEmbedComplementos] = useState({
    isDirty: false,
    isSaving: false,
  })
  const [embedImpressoras, setEmbedImpressoras] = useState({
    isDirty: false,
    isSaving: false,
  })

  const handleEmbedComplementosChange = useCallback(
    (next: { isDirty: boolean; isSaving: boolean }) => {
      setEmbedComplementos(prev =>
        prev.isDirty === next.isDirty && prev.isSaving === next.isSaving ? prev : next
      )
    },
    []
  )
  const handleEmbedImpressorasChange = useCallback(
    (next: { isDirty: boolean; isSaving: boolean }) => {
      setEmbedImpressoras(prev =>
        prev.isDirty === next.isDirty && prev.isSaving === next.isSaving ? prev : next
      )
    },
    []
  )

  /** Confirmação ao fechar o painel com produto em edição e alterações não salvas */
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

  /**
   * Incrementa a cada abertura do painel (open: false → true) para remontar o `NovoProduto`.
   * Evita herdar baseline/alterações não salvas da sessão anterior após "Sair sem salvar".
   */
  const [produtoFormSession, setProdutoFormSession] = useState(0)
  const prevPainelAbertoRef = useRef(false)

  useEffect(() => {
    if (state.open && !prevPainelAbertoRef.current) {
      setProdutoFormSession(s => s + 1)
    }
    prevPainelAbertoRef.current = state.open
  }, [state.open])

  // Limpa overlay de confirmação ao fechar; ao abrir, zera flags para não herdar sessão anterior
  useEffect(() => {
    if (!state.open) {
      setConfirmExitOpen(false)
      return
    }
    setConfirmExitOpen(false)
    suppressCloseOnNextProdutoSuccessRef.current = false
  }, [state.open])

  const handleRequestClose = useCallback(() => {
    // Duplo rAF: o baseline do produto pode ser commitado após load (setTimeout no filho); avaliar dirty no próximo frame evita falso positivo ao fechar logo ao abrir.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          npRef.current?.isDirty?.() ||
          complementosRef.current?.isDirty?.() ||
          impressorasRef.current?.isDirty?.()
        ) {
          setConfirmExitOpen(true)
          return
        }
        onClose()
      })
    })
  }, [onClose])

  const handleConfirmDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
    onClose()
  }, [onClose])

  const handleCancelDiscardExit = useCallback(() => {
    setConfirmExitOpen(false)
  }, [])

  /** Salva o produto e fecha o painel — alinhado ao rodapé do wizard (passos 0–1 vs fiscal). */
  const handleSaveAndCloseFromConfirm = useCallback(async () => {
    setConfirmExitOpen(false)
    if (npRef.current?.isDirty?.()) {
      if (wizardStep < 2) {
        void npRef.current?.savePartialAndClose()
      } else {
        void npRef.current?.saveFinal()
      }
      return
    }
    if (complementosRef.current?.isDirty?.()) {
      const ok = await complementosRef.current.save()
      if (ok) onClose()
      return
    }
    if (impressorasRef.current?.isDirty?.()) {
      const ok = await impressorasRef.current.save()
      if (ok) onClose()
    }
  }, [wizardStep, onClose])

  const handleSalvarComplementos = useCallback(async () => {
    await complementosRef.current?.save()
  }, [])

  const handleSalvarImpressoras = useCallback(async () => {
    await impressorasRef.current?.save()
  }, [])

  /** Persiste alterações pendentes do produto sem fechar o painel (orquestração com salvamento do grupo). */
  const persistPendingProdutoChanges = useCallback(async (): Promise<boolean> => {
    if (!npRef.current?.isDirty?.()) return true
    suppressCloseOnNextProdutoSuccessRef.current = true
    try {
      const ok =
        wizardStep < 2 ? await npRef.current.savePartialAndClose() : await npRef.current.saveFinal()
      if (!ok) {
        suppressCloseOnNextProdutoSuccessRef.current = false
      }
      return ok
    } catch {
      suppressCloseOnNextProdutoSuccessRef.current = false
      return false
    }
  }, [wizardStep])

  /** Salva produto pendente (se houver) e em seguida o grupo — mesma ação do botão Salvar na aba Grupo. */
  const handleSalvarGrupoCombinado = useCallback(async () => {
    const produtoOk = await persistPendingProdutoChanges()
    if (!produtoOk) return

    if (embedGrupoTab === 0) {
      const el = document.getElementById(GRUPO_PRODUTOS_MODAL_FORM_ID)
      if (el instanceof HTMLFormElement) {
        el.requestSubmit()
      }
    } else {
      await grupoNgRef.current?.saveGrupo()
    }
  }, [embedGrupoTab, persistPendingProdutoChanges])

  /**
   * Mantém cada aba montada após a primeira visita enquanto o painel estiver aberto,
   * evitando remount e novas requisições ao alternar abas.
   * Reseta ao fechar o modal ou ao trocar de produto/modo (via key do painel).
   */
  const [mountedProduto, setMountedProduto] = useState(false)
  const [mountedComplementos, setMountedComplementos] = useState(false)
  const [mountedImpressoras, setMountedImpressoras] = useState(false)
  const [mountedImagem, setMountedImagem] = useState(false)
  const [mountedGrupo, setMountedGrupo] = useState(false)

  useEffect(() => {
    if (!state.open) {
      setMountedProduto(false)
      setMountedComplementos(false)
      setMountedImpressoras(false)
      setMountedImagem(false)
      setMountedGrupo(false)
      return
    }
    if (state.tab === 'produto') setMountedProduto(true)
    // Pré-monta Complementos / Impressoras / Imagem / Grupo em background (SPA sem spinner ao trocar aba).
    if (produtoId) {
      setMountedComplementos(true)
      setMountedImpressoras(true)
      setMountedImagem(true)
    }
    if (state.grupoId) setMountedGrupo(true)
  }, [state.open, state.tab, produtoId, state.grupoId])

  const showProdutoPanel = state.open && (mountedProduto || state.tab === 'produto')
  const showComplementosPanel =
    state.open && !!produtoId && (mountedComplementos || state.tab === 'complementos')
  const showImpressorasPanel =
    state.open && !!produtoId && (mountedImpressoras || state.tab === 'impressoras')
  const showImagemPanel =
    state.open && !!produtoId && (mountedImagem || state.tab === 'imagem')
  const showGrupoPanel = state.open && !!state.grupoId && (mountedGrupo || state.tab === 'grupo')

  useEffect(() => {
    if (!state.open) return
    setWizardStep(state.initialStepProduto ?? 0)
  }, [state.open, state.initialStepProduto])

  useEffect(() => {
    if (!state.open) return
    setEmbedGrupoTab(state.initialTabGrupo ?? 0)
  }, [state.open, state.initialTabGrupo])

  /**
   * Identidade estável do painel: produto + modo. Não incluir `state.tab` — senão cada troca de aba
   * remonta o modal e o Slide dispara de novo.
   */
  const dialogKey = useMemo(() => {
    return `produto-side-${produtoId || 'new'}-${state.mode}`
  }, [produtoId, state.mode])

  const title = useMemo(() => {
    const nome = state.produto?.getNome()?.trim()

    if (state.tab === 'produto') {
      // Criação sem nome ainda: mantém o verbo da ação como título
      if (state.mode === 'create' && !nome) {
        return 'Novo Produto'
      }
      const displayName = nome || 'Produto'
      return (
        <span className="block max-w-full truncate tracking-normal" title={displayName}>
          {displayName}
        </span>
      )
    }

    if (state.tab === 'imagem') {
      return 'Imagem de'
    }

    // Complementos / Grupo / Impressoras: só o produto (a tab já dá o contexto)
    const displayName = nome || 'Produto'
    return (
      <span className="block max-w-full truncate tracking-normal" title={displayName}>
        {displayName}
      </span>
    )
  }, [state])

  /** Contexto da ação/aba — tipografia menor; o nome do produto fica no título */
  const subtitle = useMemo(() => {
    if (state.tab === 'imagem') {
      return state.produto?.getNome()
    }

    if (state.tab !== 'produto') return undefined

    if (state.mode === 'create' && !state.produto?.getNome()?.trim()) {
      return undefined
    }

    const label =
      state.mode === 'create'
        ? 'Novo produto'
        : state.mode === 'copy'
          ? 'Copiar produto'
          : 'Editar produto'

    return <span className="font-normal text-secondary-text">{label}</span>
  }, [state])

  const footerProduto = useMemo((): JiffySidePanelFooterActions | undefined => {
    if (state.tab !== 'produto') return undefined

    if (fiscalOnlyBack) {
      return {
        barSecondaryTone: 'primaryMuted',
        barShowPrevNextIcons: true,
        showPrevious: true,
        previousLabel: 'Anterior',
        onPrevious: () => npRef.current?.goBack(),
        previousDisabled: wizardSaving,
      }
    }

    if (wizardStep < 2) {
      // Step 0: Salvar e fechar | Próximo. Step 1 (Configurações): Anterior | Salvar e fechar | Próximo
      const barActionOrder =
        wizardStep === 0 ? (['cancel', 'next'] as const) : (['prev', 'cancel', 'next'] as const)

      return {
        barSecondaryTone: 'primaryMuted',
        barShowPrevNextIcons: true,
        barActionOrder: [...barActionOrder],
        showPrevious: wizardStep >= 1,
        onPrevious: () => npRef.current?.goBack(),
        previousDisabled: wizardSaving,
        showNext: true,
        nextLabel: 'Próximo',
        onNext: () => npRef.current?.goNext(),
        nextDisabled: wizardSaving,
        showCancel: true,
        cancelVariant: 'primary',
        cancelLabel: 'Salvar e fechar',
        onCancel: () => void npRef.current?.savePartialAndClose(),
        cancelDisabled: wizardSaving,
      }
    }

    return {
      barSecondaryTone: 'primaryMuted',
      barShowPrevNextIcons: true,
      showPrevious: true,
      onPrevious: () => npRef.current?.goBack(),
      previousDisabled: wizardSaving,
      showSave: true,
      saveLabel: 'Salvar e fechar',
      onSave: () => void npRef.current?.saveFinal(),
      saveLoading: wizardSaving,
      saveDisabled: wizardSaving,
    }
  }, [state.tab, wizardStep, wizardSaving, fiscalOnlyBack])

  const footerComplementos = useMemo(
    (): JiffySidePanelFooterActions => ({
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      showSave: true,
      saveLabel: 'Salvar',
      onSave: () => void handleSalvarComplementos(),
      saveLoading: embedComplementos.isSaving,
      saveDisabled: !embedComplementos.isDirty || embedComplementos.isSaving,
    }),
    [handleRequestClose, handleSalvarComplementos, embedComplementos]
  )

  const footerImpressoras = useMemo(
    (): JiffySidePanelFooterActions => ({
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      showSave: true,
      saveLabel: 'Salvar',
      onSave: () => void handleSalvarImpressoras(),
      saveLoading: embedImpressoras.isSaving,
      saveDisabled: !embedImpressoras.isDirty || embedImpressoras.isSaving,
    }),
    [handleRequestClose, handleSalvarImpressoras, embedImpressoras]
  )

  /** Aba Imagem: upload no painel — sem validação do form do produto; só Fechar. */
  const footerImagem = useMemo(
    (): JiffySidePanelFooterActions => ({
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
    }),
    [handleRequestClose]
  )

  const footerGrupo = useMemo((): JiffySidePanelFooterActions => {
    const savingGrupoOuProduto = embedGrupoForm.isSubmitting || wizardSaving
    const saveDisabled = !embedGrupoForm.canSubmit || savingGrupoOuProduto

    return {
      showCancel: true,
      cancelLabel: 'Fechar',
      cancelVariant: 'primaryTint10',
      onCancel: handleRequestClose,
      showSave: true,
      saveLabel: 'Salvar',
      onSave: () => void handleSalvarGrupoCombinado(),
      saveLoading: savingGrupoOuProduto,
      saveDisabled,
    }
  }, [embedGrupoForm, handleRequestClose, handleSalvarGrupoCombinado, wizardSaving])

  const footerActions = useMemo(() => {
    if (state.tab === 'produto') return footerProduto
    if (state.tab === 'complementos') return footerComplementos
    if (state.tab === 'impressoras') return footerImpressoras
    if (state.tab === 'imagem') return footerImagem
    if (state.tab === 'grupo' && !state.grupoId) {
      return {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10' as const,
        onCancel: handleRequestClose,
      }
    }
    if (state.tab === 'grupo') return footerGrupo
    return undefined
  }, [
    state.tab,
    state.grupoId,
    footerProduto,
    footerComplementos,
    footerImpressoras,
    footerImagem,
    footerGrupo,
    handleRequestClose,
  ])

  return (
    <>
      <JiffySidePanelModal
        key={dialogKey}
        open={state.open}
        onClose={handleRequestClose}
        title={title}
        subtitle={subtitle}
        scrollableBody={false}
        footerVariant="bar"
        panelClassName="w-[95vw] max-w-[100vw] sm:w-[90vw] md:w-[min(900px,45vw)]"
        footerActions={footerActions}
        tabsSlot={
          <div className="flex flex-wrap gap-1 px-2 pb-0">
            {(
              [
                { key: 'produto' as const, label: 'Produto', disabled: false },
                { key: 'grupo' as const, label: 'Grupo', disabled: !state.grupoId },
                { key: 'complementos' as const, label: 'Complementos', disabled: !produtoId },
                { key: 'impressoras' as const, label: 'Impressoras', disabled: !produtoId },
                { key: 'imagem' as const, label: 'Imagem', disabled: !produtoId },
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
          {showProdutoPanel ? (
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                state.tab !== 'produto' && 'hidden'
              )}
              aria-hidden={state.tab !== 'produto'}
            >
              <NovoProduto
                key={`${produtoId ?? 'new'}-${state.mode}-${produtoFormSession}`}
                ref={npRef}
                produtoId={state.mode === 'create' ? undefined : produtoId}
                initialProduto={
                  state.mode !== 'create' && state.produto?.getId() === produtoId
                    ? state.produto
                    : undefined
                }
                isCopyMode={state.mode === 'copy'}
                defaultGrupoProdutoId={
                  state.mode === 'create' ? state.prefillGrupoProdutoId : undefined
                }
                initialStep={state.initialStepProduto ?? 0}
                isEmbedded
                hideEmbeddedHeader
                hideEmbeddedFormActions
                onWizardStepChange={setWizardStep}
                onWizardSavingChange={setWizardSaving}
                onFiscalUnavailableChange={setFiscalOnlyBack}
                onClose={handleRequestClose}
                onSuccess={produtoData => {
                  onReload?.(produtoData?.produtoId, produtoData?.produtoData)
                  if (suppressCloseOnNextProdutoSuccessRef.current) {
                    suppressCloseOnNextProdutoSuccessRef.current = false
                    return
                  }
                  onClose()
                }}
              />
            </div>
          ) : null}

          {showComplementosPanel ? (
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                state.tab !== 'complementos' && 'hidden'
              )}
              aria-hidden={state.tab !== 'complementos'}
            >
              <ComplementosMultiSelectDialog
                ref={complementosRef}
                open={state.open}
                produtoId={produtoId}
                produtoNome={state.produto?.getNome()}
                initialGruposResumo={state.produto?.getGruposComplementos()}
                onClose={handleRequestClose}
                isEmbedded
                onEmbedStateChange={handleEmbedComplementosChange}
              />
            </div>
          ) : state.open && state.tab === 'complementos' && !produtoId ? (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-secondary-text">
              Selecione um produto para gerenciar complementos.
            </div>
          ) : null}

          {showImpressorasPanel ? (
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                state.tab !== 'impressoras' && 'hidden'
              )}
              aria-hidden={state.tab !== 'impressoras'}
            >
              <ProdutoImpressorasDialog
                ref={impressorasRef}
                open={state.open}
                produtoId={produtoId}
                produtoNome={state.produto?.getNome()}
                initialImpressorasResumo={state.produto?.getImpressoras()}
                onClose={handleRequestClose}
                isEmbedded
                onEmbedStateChange={handleEmbedImpressorasChange}
              />
            </div>
          ) : state.open && state.tab === 'impressoras' && !produtoId ? (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-secondary-text">
              Selecione um produto para gerenciar impressoras.
            </div>
          ) : null}

          {showImagemPanel ? (
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                state.tab !== 'imagem' && 'hidden'
              )}
              aria-hidden={state.tab !== 'imagem'}
            >
              <ProdutoImagemPanel
                open={state.open}
                produtoId={produtoId}
                produtoNome={state.produto?.getNome()}
                onReload={() => onReload?.(produtoId)}
              />
            </div>
          ) : state.open && state.tab === 'imagem' && !produtoId ? (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-secondary-text">
              Salve o produto para enviar a imagem.
            </div>
          ) : null}

          {showGrupoPanel ? (
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                state.tab !== 'grupo' && 'hidden'
              )}
              aria-hidden={state.tab !== 'grupo'}
            >
              {/* key só pelo grupoId: incluir a aba interna remontava o form e voltava para initialTab 0 */}
              <NovoGrupo
                ref={grupoNgRef}
                key={state.grupoId}
                grupoId={state.grupoId!}
                initialGrupo={state.initialGrupo}
                isEmbedded
                embeddedFormId={GRUPO_PRODUTOS_MODAL_FORM_ID}
                hideEmbeddedFormActions
                onEmbedFormStateChange={setEmbedGrupoForm}
                onEmbeddedTabChange={setEmbedGrupoTab}
                onClose={handleRequestClose}
                onReload={onReload}
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
                initialTab={state.initialTabGrupo ?? 0}
              />
            </div>
          ) : state.open && state.tab === 'grupo' && !state.grupoId ? (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center text-sm text-secondary-text">
              Selecione um grupo válido para editar.
            </div>
          ) : null}
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
                aria-labelledby="produtos-tabs-exit-title"
              >
                <h3
                  id="produtos-tabs-exit-title"
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
