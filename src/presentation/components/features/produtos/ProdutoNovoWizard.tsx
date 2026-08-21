'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Autocomplete, InputAdornment, TextField } from '@mui/material'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import { DinamicIcon } from '@/src/shared/utils/iconRenderer'
import {
  ComplementosMultiSelectDialog,
  type ComplementosMultiSelectHandle,
} from '@/src/presentation/components/features/produtos/ComplementosMultiSelectDialog'
import {
  ProdutoImpressorasDialog,
  type ProdutoImpressorasHandle,
} from '@/src/presentation/components/features/produtos/ProdutoImpressorasDialog'
import {
  ProdutoMenusPanel,
  type ProdutoMenusHandle,
} from '@/src/presentation/components/features/produtos/ProdutoMenusPanel'
import {
  NovoProduto,
  type NovoProdutoHandle,
} from '@/src/presentation/components/features/produtos/NovoProduto'
import {
  NovoGrupo,
  type NovoGrupoHandle,
} from '@/src/presentation/components/features/grupos-produtos/NovoGrupo'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import {
  unirMenuIds,
} from '@/src/presentation/utils/uploadImagemProdutoMenus'

function CategoriaIconeNome({ grupo, size = 18 }: { grupo: GrupoProduto; size?: number }) {
  const cor = grupo.getCorHex() || '#530CA3'
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        className="flex shrink-0 items-center justify-center rounded-md border"
        style={{
          borderColor: cor,
          width: size + 10,
          height: size + 10,
        }}
      >
        <DinamicIcon iconName={grupo.getIconName()} color={cor} size={size} />
      </span>
      <span className="truncate">{grupo.getNome()}</span>
    </span>
  )
}

type WizardStep = 0 | 1 | 2 | 3 | 4

const STEP_LABELS = ['Categoria', 'Produto', 'Complementos', 'Impressoras', 'Menus'] as const

export interface ProdutoNovoWizardProps {
  open: boolean
  onClose: () => void
  /** `menu` trava o cardápio atual (+ principal). `cadastro` é o fluxo do cadastro base. */
  origem: 'menu' | 'cadastro'
  menuId?: string
  menuNome?: string
  /** Pré-seleciona categoria (ex.: adicionar produto dentro de um grupo). */
  initialCategoriaId?: string
  onSuccess?: () => void
}

export function ProdutoNovoWizard({
  open,
  onClose,
  origem,
  menuId,
  menuNome,
  initialCategoriaId,
  onSuccess,
}: ProdutoNovoWizardProps) {
  const invalidate = useInvalidateTenantQueries()
  const grupoRef = useRef<NovoGrupoHandle>(null)
  const npRef = useRef<NovoProdutoHandle>(null)
  const compsRef = useRef<ComplementosMultiSelectHandle>(null)
  const impressorasRef = useRef<ProdutoImpressorasHandle>(null)
  const menusRef = useRef<ProdutoMenusHandle>(null)
  const autoNovaSemCategoriasRef = useRef(false)

  const [step, setStep] = useState<WizardStep>(0)
  const [produtoInnerStep, setProdutoInnerStep] = useState<0 | 1 | 2>(0)
  const [saving, setSaving] = useState(false)
  const [produtoSaving, setProdutoSaving] = useState(false)

  const [keepNovaCategoria, setKeepNovaCategoria] = useState(false)
  const [keepProduto, setKeepProduto] = useState(false)
  const [keepComplementos, setKeepComplementos] = useState(false)
  const [keepImpressoras, setKeepImpressoras] = useState(false)
  const [keepMenus, setKeepMenus] = useState(false)
  const [skipComplementos, setSkipComplementos] = useState(false)
  const [skipImpressoras, setSkipImpressoras] = useState(false)

  const [modoCategoria, setModoCategoria] = useState<'existente' | 'nova'>('existente')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [categoriaNomeLabel, setCategoriaNomeLabel] = useState('')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  const [categoriaNovaPersistidaId, setCategoriaNovaPersistidaId] = useState<string | null>(null)
  const [grupoCanSubmit, setGrupoCanSubmit] = useState(false)

  const { data: categorias = [], isLoading: loadingCategorias } = useGruposProdutos({
    limit: 500,
    ativo: true,
    enabled: open,
  })
  const { data: menusLista } = useMenus({ tipo: 'principal', limit: 10, enabled: open })
  const principalMenuId = useMemo(
    () => menusLista?.items.find(m => m.tipo === 'principal')?.id ?? null,
    [menusLista]
  )

  /** Pré-seleção: cadastro → principal; menu → cardápio atual (só ele travado). */
  const menusIniciaisWizard = useMemo(() => {
    if (origem === 'menu') return menuId ? [menuId] : []
    return principalMenuId ? [principalMenuId] : []
  }, [origem, menuId, principalMenuId])

  const menusTravadosWizard = useMemo(() => {
    if (origem !== 'menu') return [] as string[]
    return menuId ? [menuId] : []
  }, [origem, menuId])

  const previewMenuId = origem === 'menu' ? menuId : undefined

  const resetState = useCallback(() => {
    setStep(0)
    setProdutoInnerStep(0)
    setSaving(false)
    setProdutoSaving(false)
    setKeepNovaCategoria(false)
    setKeepProduto(false)
    setKeepComplementos(false)
    setKeepImpressoras(false)
    setKeepMenus(false)
    setSkipComplementos(false)
    setSkipImpressoras(false)
    setModoCategoria('existente')
    setCategoriaId(initialCategoriaId ?? null)
    setCategoriaNomeLabel('')
    setNovaCategoriaNome('')
    setCategoriaNovaPersistidaId(null)
    setGrupoCanSubmit(false)
    autoNovaSemCategoriasRef.current = false
  }, [initialCategoriaId])

  useEffect(() => {
    if (open) resetState()
    else {
      setKeepNovaCategoria(false)
      setKeepProduto(false)
      setKeepComplementos(false)
      setKeepImpressoras(false)
      setKeepMenus(false)
    }
  }, [open, resetState])

  const categoriasUnicas = useMemo(() => {
    const seen = new Set<string>()
    const out: GrupoProduto[] = []
    for (const grupo of categorias) {
      const id = grupo.getId()
      if (!id || seen.has(id)) continue
      seen.add(id)
      out.push(grupo)
    }
    return out
  }, [categorias])

  useEffect(() => {
    if (!open || !categoriaId || categoriaNomeLabel) return
    const grupo = categoriasUnicas.find(g => g.getId() === categoriaId)
    if (grupo) setCategoriaNomeLabel(grupo.getNome())
  }, [open, categoriaId, categoriaNomeLabel, categoriasUnicas])

  useEffect(() => {
    if (!open || loadingCategorias || autoNovaSemCategoriasRef.current || initialCategoriaId) return
    if (categoriasUnicas.length === 0) {
      autoNovaSemCategoriasRef.current = true
      setModoCategoria('nova')
      setKeepNovaCategoria(true)
    }
  }, [open, loadingCategorias, categoriasUnicas.length, initialCategoriaId])

  const categoriaSelecionada = useMemo(
    () => categoriasUnicas.find((g: GrupoProduto) => g.getId() === categoriaId) ?? null,
    [categoriasUnicas, categoriaId]
  )

  const grupoProdutoIdParaProduto =
    modoCategoria === 'existente' ? categoriaId : categoriaNovaPersistidaId

  const categoriaLabelProduto =
    modoCategoria === 'existente'
      ? categoriaNomeLabel || categoriaSelecionada?.getNome() || ''
      : novaCategoriaNome

  const canAdvanceCategoria =
    modoCategoria === 'existente' ? Boolean(categoriaId) : grupoCanSubmit

  const busy = saving || produtoSaving

  const invalidateAposSalvar = useCallback(async () => {
    await invalidate(['grupos-produtos'])
    await invalidate(['produtos'])
    await invalidate(['menus'])
    if (origem === 'menu' && menuId) {
      await invalidate(['menu', menuId])
      await invalidate(['menu-produtos', menuId])
      await invalidate(['menu-grupos', menuId])
    }
  }, [invalidate, origem, menuId])

  const ensureCategoria = useCallback(async (): Promise<string | null> => {
    if (modoCategoria === 'existente') {
      if (!categoriaId) {
        showToast.error('Selecione uma categoria')
        return null
      }
      return categoriaId
    }

    if (!grupoRef.current) {
      showToast.error('Não foi possível criar a categoria')
      return null
    }
    const id = await grupoRef.current.saveGrupo({ silent: true })
    if (!id) return null
    setCategoriaNovaPersistidaId(id)
    setCategoriaId(id)
    return id
  }, [modoCategoria, categoriaId])

  const handleNextFromCategoria = useCallback(() => {
    if (!canAdvanceCategoria) {
      showToast.error(
        modoCategoria === 'nova' ? 'Informe o nome da categoria' : 'Selecione uma categoria'
      )
      return
    }
    if (modoCategoria === 'existente') {
      setCategoriaNomeLabel(categoriaSelecionada?.getNome() ?? categoriaNomeLabel)
    }
    setKeepProduto(true)
    setStep(1)
  }, [canAdvanceCategoria, modoCategoria, categoriaSelecionada, categoriaNomeLabel])

  const handleNextFromProduto = useCallback(() => {
    if (!(npRef.current?.canAdvanceCurrentPage() ?? true)) {
      showToast.error('Preencha os dados obrigatórios do produto')
      return
    }
    if (produtoInnerStep < 2) {
      npRef.current?.goNext()
      return
    }
    setKeepComplementos(true)
    setStep(2)
  }, [produtoInnerStep])

  const finishWizard = useCallback(async () => {
    if (origem === 'menu' && !menuId) {
      showToast.error('Menu inválido para concluir o cadastro')
      return
    }

    setSaving(true)
    try {
      // Preferir categoria existente escolhida no passo 2; senão criar a nova do passo 1.
      const grupoEscolhidoNoForm = npRef.current?.getGrupoProdutoId() ?? null
      const grupoId = grupoEscolhidoNoForm
        ? grupoEscolhidoNoForm
        : await ensureCategoria()
      if (!grupoId) return

      const gruposComplementosIds = skipComplementos
        ? []
        : (compsRef.current?.getSelectedIds() ?? [])
      const impressorasIds = skipImpressoras
        ? []
        : (impressorasRef.current?.getSelectedIds() ?? [])
      const menusEscolhidos = menusRef.current?.getSelectedIds() ?? []
      let menuIds = unirMenuIds(menusEscolhidos)

      if (origem === 'menu') {
        menuIds = unirMenuIds(menuId, menusEscolhidos)
        if (!menuId || !menuIds.includes(menuId)) {
          showToast.error('Mantenha o cardápio atual vinculado ao produto')
          return
        }
      }
      // Cadastro base: seleção vazia é válida (só produto base, sem vínculo a menus).

      const ok = await npRef.current?.saveFinal({
        grupoId,
        gruposComplementosIds,
        impressorasIds,
        menuIds,
      })
      if (!ok) return

      await invalidateAposSalvar()
      onSuccess?.()
      onClose()
    } catch (err) {
      showToast.error(err instanceof Error ? err.message : 'Erro ao finalizar cadastro')
    } finally {
      setSaving(false)
    }
  }, [
    origem,
    menuId,
    ensureCategoria,
    invalidateAposSalvar,
    onClose,
    onSuccess,
    skipComplementos,
    skipImpressoras,
  ])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (step === 0) {
      return {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showNext: true,
        nextLabel: 'Continuar',
        onNext: handleNextFromCategoria,
        nextDisabled: !canAdvanceCategoria || busy,
        showPrevious: false,
        barShowPrevNextIcons: true,
        barSecondaryTone: 'primaryMuted',
        barActionOrder: ['cancel', 'next'],
      }
    }

    if (step === 1) {
      return {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showPrevious: true,
        previousLabel: 'Anterior',
        onPrevious: () => {
          if (produtoInnerStep === 0) setStep(0)
          else npRef.current?.goBack()
        },
        previousDisabled: busy,
        showNext: true,
        nextLabel: 'Continuar',
        onNext: handleNextFromProduto,
        nextDisabled: busy,
        barShowPrevNextIcons: true,
        barSecondaryTone: 'primaryMuted',
      }
    }

    if (step === 2) {
      return {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showPrevious: true,
        previousLabel: 'Anterior',
        onPrevious: () => setStep(1),
        previousDisabled: busy,
        showNext: true,
        nextLabel: 'Continuar',
        onNext: () => {
          setSkipComplementos(false)
          setKeepImpressoras(true)
          setStep(3)
        },
        nextDisabled: busy,
        barShowPrevNextIcons: true,
        barSecondaryTone: 'primaryMuted',
      }
    }

    if (step === 3) {
      return {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showPrevious: true,
        previousLabel: 'Anterior',
        onPrevious: () => setStep(2),
        previousDisabled: busy,
        showNext: true,
        nextLabel: 'Continuar',
        onNext: () => {
          setSkipImpressoras(false)
          setKeepMenus(true)
          setStep(4)
        },
        nextDisabled: busy,
        barShowPrevNextIcons: true,
        barSecondaryTone: 'primaryMuted',
      }
    }

    return {
      showCancel: false,
      showPrevious: true,
      previousLabel: 'Anterior',
      onPrevious: () => setStep(3),
      previousDisabled: busy,
      showSave: true,
      saveLabel: 'Concluir',
      onSave: () => {
        void finishWizard()
      },
      saveLoading: busy,
      saveDisabled: busy,
      barShowPrevNextIcons: true,
      barSecondaryTone: 'primaryMuted',
      barActionOrder: ['prev', 'save'],
    }
  }, [
    step,
    onClose,
    handleNextFromCategoria,
    handleNextFromProduto,
    finishWizard,
    canAdvanceCategoria,
    busy,
    produtoInnerStep,
  ])

  const titulo =
    origem === 'menu' ? 'Cadastrar produto neste cardápio' : 'Cadastrar novo produto'

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={titulo}
      subtitle={
        origem === 'menu' && menuNome ? (
          <span className="text-base font-medium normal-case"># {menuNome}</span>
        ) : undefined
      }
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_WIDE_PANEL_CLASS}
      footerActions={footerActions}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-primary/20 bg-info px-2 pt-2 md:px-4">
          {STEP_LABELS.map((label, index) => {
            const active = step === index
            const done = step > index
            return (
              <div
                key={label}
                className={cn(
                  'flex-1 whitespace-nowrap rounded-t-lg px-2 py-2 text-center text-[11px] font-semibold md:text-sm',
                  active && 'bg-white text-primary',
                  done && !active && 'text-primary/70',
                  !active && !done && 'text-secondary-text'
                )}
              >
                <span className="mr-1 tabular-nums">{index + 1}.</span>
                {label}
              </div>
            )
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 md:p-4">
          {step === 0 ? (
            <div className="rounded-[10px] bg-info p-2 md:p-4">
              <div className="mb-2 flex items-center gap-5">
                <h2 className="text-xl font-semibold text-primary">Categoria</h2>
                <div className="h-px flex-1 bg-primary/70" />
              </div>
              <p className="mb-4 text-sm text-secondary-text">
                Escolha uma categoria existente ou crie uma nova. Continuar não grava ainda;
                a categoria nova só é criada ao concluir.
              </p>

              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setModoCategoria('existente')
                    setCategoriaNovaPersistidaId(null)
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                    modoCategoria === 'existente'
                      ? 'border-primary bg-primary text-white'
                      : 'border-primary/40 bg-white text-primary hover:bg-primary/10'
                  )}
                >
                  Usar existente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModoCategoria('nova')
                    setKeepNovaCategoria(true)
                    setCategoriaId(null)
                    setCategoriaNomeLabel('')
                    setCategoriaNovaPersistidaId(null)
                  }}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
                    modoCategoria === 'nova'
                      ? 'border-primary bg-primary text-white'
                      : 'border-primary/40 bg-white text-primary hover:bg-primary/10'
                  )}
                >
                  Criar nova
                </button>
              </div>

              {modoCategoria === 'existente' ? (
                <Autocomplete
                  id="produto-wizard-categoria"
                  size="small"
                  options={categoriasUnicas}
                  loading={loadingCategorias}
                  loadingText="Carregando..."
                  noOptionsText="Nenhuma categoria encontrada"
                  getOptionLabel={(grupo: GrupoProduto) => grupo.getNome()}
                  getOptionKey={(grupo: GrupoProduto) => grupo.getId()}
                  isOptionEqualToValue={(a, b) => a.getId() === b.getId()}
                  value={categoriaSelecionada}
                  onChange={(_, grupo) => {
                    setCategoriaId(grupo?.getId() ?? null)
                    setCategoriaNomeLabel(grupo?.getNome() ?? '')
                  }}
                  renderOption={(props, grupo) => {
                    const { key: _key, ...rest } = props
                    return (
                      <li {...rest} key={grupo.getId()}>
                        <CategoriaIconeNome grupo={grupo} />
                      </li>
                    )
                  }}
                  renderInput={params => (
                    <TextField
                      {...params}
                      label="Categoria"
                      placeholder="Pesquise ou selecione"
                      InputLabelProps={{
                        ...params.InputLabelProps,
                        shrink: true,
                      }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            {categoriaSelecionada ? (
                              <InputAdornment position="start" sx={{ ml: 0.5, mr: 0 }}>
                                <span
                                  className="flex items-center justify-center rounded-md border"
                                  style={{
                                    borderColor: categoriaSelecionada.getCorHex() || '#530CA3',
                                    width: 26,
                                    height: 26,
                                  }}
                                >
                                  <DinamicIcon
                                    iconName={categoriaSelecionada.getIconName()}
                                    color={categoriaSelecionada.getCorHex() || '#530CA3'}
                                    size={16}
                                  />
                                </span>
                              </InputAdornment>
                            ) : null}
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                      sx={{
                        ...sxEntradaCompactaProduto,
                        '& .MuiOutlinedInput-root': { backgroundColor: '#fff' },
                      }}
                    />
                  )}
                />
              ) : null}
            </div>
          ) : null}

          {modoCategoria === 'nova' || keepNovaCategoria ? (
            <div
              className={cn(
                'min-h-[280px]',
                (step !== 0 || modoCategoria !== 'nova') && 'hidden'
              )}
            >
              <NovoGrupo
                ref={grupoRef}
                grupoId={categoriaNovaPersistidaId ?? undefined}
                isEmbedded
                hideEmbeddedFormActions
                detalhesOnly
                nestedPickerZIndex={1450}
                onGrupoNomeChange={setNovaCategoriaNome}
                onEmbedFormStateChange={state => setGrupoCanSubmit(state.canSubmit)}
              />
            </div>
          ) : null}

          {step === 1 || keepProduto ? (
            <div className={cn('flex h-full min-h-[320px] flex-col', step !== 1 && 'hidden')}>
              <NovoProduto
                ref={npRef}
                isEmbedded
                hideEmbeddedHeader
                hideEmbeddedFormActions
                previewMenuId={previewMenuId}
                defaultGrupoProdutoId={grupoProdutoIdParaProduto ?? undefined}
                pendingNovaCategoriaLabel={
                  modoCategoria === 'nova' ? categoriaLabelProduto || undefined : undefined
                }
                onWizardStepChange={setProdutoInnerStep}
                onWizardSavingChange={setProdutoSaving}
                onSuccess={() => undefined}
                onClose={() => undefined}
              />
            </div>
          ) : null}

          {step === 2 || keepComplementos ? (
            <div className={cn('flex h-full min-h-[320px] flex-col', step !== 2 && 'hidden')}>
              <ComplementosMultiSelectDialog
                ref={compsRef}
                open={open}
                modoRascunho
                isEmbedded
                onClose={() => undefined}
              />
            </div>
          ) : null}

          {step === 3 || keepImpressoras ? (
            <div className={cn('flex h-full min-h-[320px] flex-col', step !== 3 && 'hidden')}>
              <ProdutoImpressorasDialog
                ref={impressorasRef}
                open={open}
                modoRascunho
                isEmbedded
                onClose={() => undefined}
              />
            </div>
          ) : null}

          {step === 4 || keepMenus ? (
            <div className={cn('flex h-full min-h-[320px] flex-col', step !== 4 && 'hidden')}>
              <ProdutoMenusPanel
                key={`wizard-menus-${origem}-${menusIniciaisWizard.join('|')}-${menusTravadosWizard.join('|')}`}
                ref={menusRef}
                persistChanges={false}
                isEmbedded
                initialMenuIds={menusIniciaisWizard}
                lockedMenuIds={menusTravadosWizard}
                description={
                  origem === 'menu'
                    ? 'Este cardápio já entra e não pode ser desmarcado. Marque outros se quiser o produto em mais menus (incluindo o principal).'
                    : 'O menu principal já vem marcado. Você pode desmarcá-lo e salvar só o produto base, ou incluir outros cardápios.'
                }
              />
            </div>
          ) : null}
        </div>

        {busy ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40">
            <JiffyLoading />
          </div>
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
