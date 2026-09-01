'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Produto } from '@/src/domain/entities/Produto'
import { NovoProduto, type NovoProdutoHandle } from './NovoProduto'
import { ComplementosMultiSelectDialog, type ComplementosMultiSelectHandle } from './ComplementosMultiSelectDialog'
import {
  ProdutoImpressorasDialog,
  type ProdutoImpressorasHandle,
} from './ProdutoImpressorasDialog'
import { ProdutoMenusPanel, type ProdutoMenusHandle } from './ProdutoMenusPanel'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { cn } from '@/src/shared/utils/cn'

export type ProdutosTabsTabKey = 'produto' | 'complementos' | 'impressoras' | 'menus'
type TabKey = ProdutosTabsTabKey

export interface ProdutosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'copy'
  produto?: Produto
  prefillGrupoProdutoId?: string
  grupoId?: string
  initialStepProduto?: 0 | 1 | 2
  /** Na criação, vincula o produto a estes menus (POST `menuIds`). */
  createMenuIds?: string[]
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
  const complementosRef = useRef<ComplementosMultiSelectHandle>(null)
  const impressorasRef = useRef<ProdutoImpressorasHandle>(null)
  const menusRef = useRef<ProdutoMenusHandle>(null)

  const isDraftProduto = state.mode === 'create' || state.mode === 'copy'

  const { data: menusPrincipais } = useMenus({
    tipo: 'principal',
    limit: 10,
    enabled: state.open && state.mode === 'create',
  })
  const principalMenuId = useMemo(
    () => menusPrincipais?.items.find(m => m.tipo === 'principal')?.id ?? null,
    [menusPrincipais]
  )

  const [draftMenuIds, setDraftMenuIds] = useState<string[]>([])
  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(state.initialStepProduto ?? 0)
  const [wizardSaving, setWizardSaving] = useState(false)
  const [fiscalOnlyBack, setFiscalOnlyBack] = useState(false)

  const [embedComplementos, setEmbedComplementos] = useState({
    isDirty: false,
    isSaving: false,
  })
  const [embedImpressoras, setEmbedImpressoras] = useState({
    isDirty: false,
    isSaving: false,
  })
  const [embedMenus, setEmbedMenus] = useState({
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
  const handleEmbedMenusChange = useCallback(
    (next: { isDirty: boolean; isSaving: boolean }) => {
      setEmbedMenus(prev =>
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
  const seededPrincipalCreateRef = useRef(false)

  useEffect(() => {
    if (state.open && !prevPainelAbertoRef.current) {
      setProdutoFormSession(s => s + 1)
      seededPrincipalCreateRef.current = false
      if (state.mode === 'create') {
        const fromCaller = state.createMenuIds ?? []
        if (fromCaller.length > 0) {
          setDraftMenuIds(fromCaller)
          seededPrincipalCreateRef.current = true
        } else if (principalMenuId) {
          setDraftMenuIds([principalMenuId])
          seededPrincipalCreateRef.current = true
        } else {
          setDraftMenuIds([])
        }
      } else if (state.mode === 'copy') {
        setDraftMenuIds((state.produto?.getMenus() ?? []).map(m => m.id).filter(Boolean))
      } else {
        setDraftMenuIds([])
      }
    }
    if (!state.open) {
      seededPrincipalCreateRef.current = false
    }
    prevPainelAbertoRef.current = state.open
  }, [state.open, state.mode, state.createMenuIds, state.produto, principalMenuId])

  /** Cadastro sem createMenuIds: pré-marca o principal uma vez quando ele chega após abrir. */
  useEffect(() => {
    if (!state.open || state.mode !== 'create') return
    if ((state.createMenuIds?.length ?? 0) > 0) return
    if (seededPrincipalCreateRef.current || !principalMenuId) return
    seededPrincipalCreateRef.current = true
    setDraftMenuIds(prev => (prev.length === 0 ? [principalMenuId] : prev))
  }, [state.open, state.mode, state.createMenuIds, principalMenuId])

  // Limpa overlay de confirmação ao fechar
  useEffect(() => {
    if (!state.open) {
      setConfirmExitOpen(false)
      return
    }
    setConfirmExitOpen(false)
  }, [state.open])

  const handleRequestClose = useCallback(() => {
    // Duplo rAF: o baseline do produto pode ser commitado após load (setTimeout no filho); avaliar dirty no próximo frame evita falso positivo ao fechar logo ao abrir.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (
          npRef.current?.isDirty?.() ||
          complementosRef.current?.isDirty?.() ||
          impressorasRef.current?.isDirty?.() ||
          menusRef.current?.isDirty?.()
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
    if (npRef.current?.isDirty?.() || (isDraftProduto && menusRef.current?.isDirty?.())) {
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
      return
    }
    if (menusRef.current?.isDirty?.()) {
      const ok = await menusRef.current.save()
      if (ok) onClose()
    }
  }, [wizardStep, onClose, isDraftProduto])

  const handleSalvarComplementos = useCallback(async () => {
    await complementosRef.current?.save()
  }, [])

  const handleSalvarImpressoras = useCallback(async () => {
    await impressorasRef.current?.save()
  }, [])

  const handleSalvarMenus = useCallback(async () => {
    const ok = (await menusRef.current?.save()) ?? false
    if (ok) onClose()
  }, [onClose])

  /** Na criação/cópia, Salvar na aba Menus grava o produto (POST), como nas 3 etapas. */
  const handleSalvarProdutoNaAbaMenus = useCallback(() => {
    if (wizardStep < 2) {
      void npRef.current?.savePartialAndClose()
      return
    }
    void npRef.current?.saveFinal()
  }, [wizardStep])

  /**
   * Mantém cada aba montada após a primeira visita enquanto o painel estiver aberto,
   * evitando remount e novas requisições ao alternar abas.
   * Reseta ao fechar o modal ou ao trocar de produto/modo (via key do painel).
   */
  const [mountedProduto, setMountedProduto] = useState(false)
  const [mountedComplementos, setMountedComplementos] = useState(false)
  const [mountedImpressoras, setMountedImpressoras] = useState(false)
  const [mountedMenus, setMountedMenus] = useState(false)

  useEffect(() => {
    if (!state.open) {
      setMountedProduto(false)
      setMountedComplementos(false)
      setMountedImpressoras(false)
      setMountedMenus(false)
      return
    }
    if (isDraftProduto || state.tab === 'produto') setMountedProduto(true)
    if (produtoId) {
      setMountedComplementos(true)
      setMountedImpressoras(true)
    }
    if (isDraftProduto || (produtoId && state.mode === 'edit')) {
      setMountedMenus(true)
    }
  }, [state.open, state.tab, produtoId, state.mode, isDraftProduto])

  const showProdutoPanel = state.open && (mountedProduto || state.tab === 'produto')
  const showComplementosPanel =
    state.open && !!produtoId && (mountedComplementos || state.tab === 'complementos')
  const showImpressorasPanel =
    state.open && !!produtoId && (mountedImpressoras || state.tab === 'impressoras')
  const showMenusPanel =
    state.open && (isDraftProduto || (state.mode === 'edit' && !!produtoId)) &&
    (mountedMenus || state.tab === 'menus')

  useEffect(() => {
    if (!state.open) return
    setWizardStep(state.initialStepProduto ?? 0)
  }, [state.open, state.initialStepProduto])

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

    // Complementos / Impressoras / Menus: só o produto (a tab já dá o contexto)
    const displayName = nome || 'Produto'
    return (
      <span className="block max-w-full truncate tracking-normal" title={displayName}>
        {displayName}
      </span>
    )
  }, [state])

  /** Contexto da ação/aba — tipografia menor; o nome do produto fica no título */
  const subtitle = useMemo(() => {
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
      barActionOrder: ['prev', 'save', 'next'],
      showPrevious: true,
      onPrevious: () => npRef.current?.goBack(),
      previousDisabled: wizardSaving,
      showSave: true,
      saveLabel: 'Salvar e fechar',
      onSave: () => void npRef.current?.saveFinal(),
      saveLoading: wizardSaving,
      saveDisabled: wizardSaving,
      showNext: true,
      nextLabel: 'Próximo',
      onNext: () => onTabChange('menus'),
      nextDisabled: wizardSaving,
    }
  }, [state.tab, wizardStep, wizardSaving, fiscalOnlyBack, onTabChange])

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

  const footerMenus = useMemo(
    (): JiffySidePanelFooterActions =>
      isDraftProduto
        ? {
            showCancel: true,
            cancelLabel: 'Fechar',
            cancelVariant: 'primaryTint10',
            onCancel: handleRequestClose,
            showSave: true,
            saveLabel: 'Salvar e fechar',
            onSave: handleSalvarProdutoNaAbaMenus,
            saveLoading: wizardSaving,
            saveDisabled: wizardSaving,
          }
        : {
            showCancel: true,
            cancelLabel: 'Fechar',
            cancelVariant: 'primaryTint10',
            onCancel: handleRequestClose,
            showSave: true,
            saveLabel: 'Salvar e fechar',
            onSave: () => void handleSalvarMenus(),
            saveLoading: embedMenus.isSaving,
            saveDisabled: !embedMenus.isDirty || embedMenus.isSaving,
          },
    [
      handleRequestClose,
      handleSalvarMenus,
      handleSalvarProdutoNaAbaMenus,
      embedMenus,
      isDraftProduto,
      wizardSaving,
    ]
  )

  const footerActions = useMemo(() => {
    if (state.tab === 'produto') return footerProduto
    if (state.tab === 'complementos') return footerComplementos
    if (state.tab === 'impressoras') return footerImpressoras
    if (state.tab === 'menus') return footerMenus
    return undefined
  }, [state.tab, footerProduto, footerComplementos, footerImpressoras, footerMenus])

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
        panelClassName={MENU_WIDE_PANEL_CLASS}
        footerActions={footerActions}
        tabsSlot={
          <div className="flex flex-wrap gap-1 px-2 pb-0">
            {(
              [
                { key: 'produto' as const, label: 'Produto', disabled: false },
                { key: 'complementos' as const, label: 'Complementos', disabled: !produtoId },
                { key: 'impressoras' as const, label: 'Impressoras', disabled: !produtoId },
                {
                  key: 'menus' as const,
                  label: 'Menus',
                  disabled: !(isDraftProduto || (state.mode === 'edit' && !!produtoId)),
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
                menuIds={isDraftProduto ? draftMenuIds : undefined}
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

          {showMenusPanel ? (
            <div
              className={cn(
                'flex min-h-0 flex-1 flex-col overflow-hidden',
                state.tab !== 'menus' && 'hidden'
              )}
              aria-hidden={state.tab !== 'menus'}
            >
              <ProdutoMenusPanel
                key={`menus-${produtoFormSession}`}
                ref={menusRef}
                produtoId={state.mode === 'edit' ? produtoId : undefined}
                persistChanges={state.mode === 'edit'}
                isEmbedded
                initialMenusResumo={state.mode === 'edit' ? state.produto?.getMenus() : undefined}
                initialMenuIds={isDraftProduto ? draftMenuIds : undefined}
                onSelectionChange={isDraftProduto ? setDraftMenuIds : undefined}
                onEmbedStateChange={handleEmbedMenusChange}
                description={
                  state.mode === 'create'
                    ? 'O menu principal já vem marcado. Você pode desmarcá-lo e salvar só o produto base, ou incluir outros cardápios.'
                    : undefined
                }
              />
            </div>
          ) : state.open && state.tab === 'menus' && state.mode === 'edit' && !produtoId ? (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center px-4 text-center text-sm text-secondary-text">
              Selecione um produto para vincular aos cardápios.
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
