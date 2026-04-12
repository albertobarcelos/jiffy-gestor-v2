'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Produto } from '@/src/domain/entities/Produto'
import { NovoProduto, type NovoProdutoHandle } from './NovoProduto'
import { ComplementosMultiSelectDialog } from './ComplementosMultiSelectDialog'
import { ProdutoImpressorasDialog } from './ProdutoImpressorasDialog'
import { NovoGrupo } from '../grupos-produtos/NovoGrupo'
import { GRUPO_PRODUTOS_MODAL_FORM_ID } from '../grupos-produtos/grupoProdutosModalConstants'

type TabKey = 'produto' | 'complementos' | 'impressoras' | 'grupo'

export interface ProdutosTabsModalState {
  open: boolean
  tab: TabKey
  mode: 'create' | 'edit' | 'copy'
  produto?: Produto
  prefillGrupoProdutoId?: string
  grupoId?: string
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

export function ProdutosTabsModal({ state, onClose, onReload, onTabChange }: ProdutosTabsModalProps) {
  const produtoId = state.produto?.getId()
  const npRef = useRef<NovoProdutoHandle>(null)

  const [wizardStep, setWizardStep] = useState<0 | 1 | 2>(state.initialStepProduto ?? 0)
  const [wizardSaving, setWizardSaving] = useState(false)
  const [fiscalOnlyBack, setFiscalOnlyBack] = useState(false)

  const [embedGrupoTab, setEmbedGrupoTab] = useState(state.initialTabGrupo ?? 0)
  const [embedGrupoForm, setEmbedGrupoForm] = useState({
    isSubmitting: false,
    canSubmit: false,
  })

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
    if (state.tab === 'produto') {
      switch (state.mode) {
        case 'create':
          return 'Novo Produto'
        case 'copy':
          return 'Copiar Produto'
        case 'edit':
        default:
          return 'Editar Produto'
      }
    }
    if (state.tab === 'complementos') {
      return state.produto ? `Complementos — ${state.produto.getNome()}` : 'Complementos'
    }
    if (state.tab === 'impressoras') {
      return state.produto ? `Impressoras — ${state.produto.getNome()}` : 'Impressoras'
    }
    return state.grupoId ? 'Grupo de Produtos' : 'Grupo de Produtos'
  }, [state])

  const subtitle = useMemo(() => {
    if (state.tab === 'produto' && state.produto) {
      return state.produto.getNome()
    }
    return undefined
  }, [state.tab, state.produto])

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
        wizardStep === 0 ?
          (['cancel', 'next'] as const)
        : (['prev', 'cancel', 'next'] as const)

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
        onCancel: () => npRef.current?.savePartialAndClose(),
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
      onSave: () => npRef.current?.saveFinal(),
      saveLoading: wizardSaving,
      saveDisabled: wizardSaving,
    }
  }, [state.tab, wizardStep, wizardSaving, fiscalOnlyBack])

  const footerComplementosOuImpressoras = useMemo(
    (): JiffySidePanelFooterActions => ({
      showSave: true,
      saveLabel: 'Fechar',
      onSave: onClose,
    }),
    [onClose]
  )

  const footerGrupo = useMemo((): JiffySidePanelFooterActions => {
    if (embedGrupoTab === 0) {
      return {
        showSave: true,
        saveLabel: 'Salvar',
        saveFormId: GRUPO_PRODUTOS_MODAL_FORM_ID,
        saveLoading: embedGrupoForm.isSubmitting,
        saveDisabled: !embedGrupoForm.canSubmit || embedGrupoForm.isSubmitting,
      }
    }
    return {
      showSave: true,
      saveLabel: 'Fechar',
      onSave: onClose,
    }
  }, [embedGrupoTab, embedGrupoForm, onClose])

  const footerActions = useMemo(() => {
    if (state.tab === 'produto') return footerProduto
    if (state.tab === 'complementos' || state.tab === 'impressoras') return footerComplementosOuImpressoras
    if (state.tab === 'grupo' && !state.grupoId) {
      return footerComplementosOuImpressoras
    }
    if (state.tab === 'grupo') return footerGrupo
    return undefined
  }, [
    state.tab,
    state.grupoId,
    footerProduto,
    footerComplementosOuImpressoras,
    footerGrupo,
  ])

  return (
    <JiffySidePanelModal
      key={dialogKey}
      open={state.open}
      onClose={onClose}
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
              { key: 'complementos' as const, label: 'Complementos', disabled: !produtoId },
              { key: 'impressoras' as const, label: 'Impressoras', disabled: !produtoId },
              { key: 'grupo' as const, label: 'Grupo', disabled: !state.grupoId },
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
        {state.tab === 'produto' ? (
          <NovoProduto
            ref={npRef}
            produtoId={state.mode === 'create' ? undefined : produtoId}
            isCopyMode={state.mode === 'copy'}
            defaultGrupoProdutoId={state.mode === 'create' ? state.prefillGrupoProdutoId : undefined}
            initialStep={state.initialStepProduto ?? 0}
            isEmbedded
            hideEmbeddedHeader
            hideEmbeddedFormActions
            onWizardStepChange={setWizardStep}
            onWizardSavingChange={setWizardSaving}
            onFiscalUnavailableChange={setFiscalOnlyBack}
            onClose={onClose}
            onSuccess={produtoData => {
              onReload?.(produtoData?.produtoId, produtoData?.produtoData)
              onClose()
            }}
          />
        ) : null}

        {state.tab === 'complementos' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {produtoId ? (
              <ComplementosMultiSelectDialog
                open
                produtoId={produtoId}
                produtoNome={state.produto?.getNome()}
                onClose={onClose}
                isEmbedded
              />
            ) : (
              <div className="flex h-full flex-1 items-center justify-center text-sm text-secondary-text">
                Selecione um produto para gerenciar complementos.
              </div>
            )}
          </div>
        ) : null}

        {state.tab === 'impressoras' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {produtoId ? (
              <ProdutoImpressorasDialog
                open
                produtoId={produtoId}
                produtoNome={state.produto?.getNome()}
                onClose={onClose}
                isEmbedded
              />
            ) : (
              <div className="flex h-full flex-1 items-center justify-center text-sm text-secondary-text">
                Selecione um produto para gerenciar impressoras.
              </div>
            )}
          </div>
        ) : null}

        {state.tab === 'grupo' ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {state.grupoId ? (
              <NovoGrupo
                key={`${state.grupoId}-${embedGrupoTab}`}
                grupoId={state.grupoId}
                isEmbedded
                embeddedFormId={GRUPO_PRODUTOS_MODAL_FORM_ID}
                hideEmbeddedFormActions
                onEmbedFormStateChange={setEmbedGrupoForm}
                onEmbeddedTabChange={setEmbedGrupoTab}
                onClose={onClose}
                onSaved={() => {
                  onReload?.()
                  onClose()
                }}
                initialTab={state.initialTabGrupo ?? 0}
              />
            ) : (
              <div className="flex h-full flex-1 items-center justify-center text-sm text-secondary-text">
                Selecione um grupo válido para editar.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
