'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Autocomplete, FormControl, InputLabel, MenuItem, Select, TextField } from '@mui/material'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { Input } from '@/src/presentation/components/ui/input'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { sxEntradaCompactaProduto, sxEntradaCompactaProdutoSelect } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { UNIDADES_MEDIDA_PRODUTO_OPCOES } from '@/src/shared/types/unidadeMedidaProduto'
import { useGruposProdutos } from '@/src/presentation/hooks/useGruposProdutos'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { fetchGestorApi } from '@/src/presentation/utils/fetchGestorApi'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import type { GrupoProduto } from '@/src/domain/entities/GrupoProduto'
import {
  ComplementosMultiSelectDialog,
  type ComplementosMultiSelectHandle,
} from '@/src/presentation/components/features/produtos/ComplementosMultiSelectDialog'
import { MENU_SIDE_PANEL_CLASS } from './menuPanelConstants'

type WizardStep = 0 | 1 | 2

const STEP_LABELS = ['Categoria', 'Produto', 'Complementos'] as const

interface MenuNovoProdutoWizardProps {
  open: boolean
  menuId: string
  menuNome?: string
  onClose: () => void
}

function extrairIdDaResposta(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  const root = payload as Record<string, unknown>
  const nested =
    root.data && typeof root.data === 'object' && !Array.isArray(root.data)
      ? (root.data as Record<string, unknown>)
      : null
  const candidates = [root.id, root.produtoId, nested?.id, nested?.produtoId]
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c.trim()
  }
  return undefined
}

function formatCurrency(value: string) {
  const numbers = value.replace(/\D/g, '')
  if (!numbers) return ''
  const num = parseFloat(numbers) / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num)
}

export function MenuNovoProdutoWizard({
  open,
  menuId,
  menuNome,
  onClose,
}: MenuNovoProdutoWizardProps) {
  const invalidate = useInvalidateTenantQueries()
  const compsRef = useRef<ComplementosMultiSelectHandle>(null)

  const [step, setStep] = useState<WizardStep>(0)
  const [saving, setSaving] = useState(false)
  /** Mantém o passo 3 montado ao voltar, para não perder a seleção local. */
  const [keepComplementos, setKeepComplementos] = useState(false)

  // Passo 1 — categoria
  const [modoCategoria, setModoCategoria] = useState<'existente' | 'nova'>('existente')
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [categoriaNomeLabel, setCategoriaNomeLabel] = useState('')
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('')
  /** Id da categoria nova já gravada neste wizard (retry do Concluir). */
  const [categoriaNovaPersistidaId, setCategoriaNovaPersistidaId] = useState<string | null>(null)

  // Passo 2 — produto
  const [nomeProduto, setNomeProduto] = useState('')
  const [descricaoProduto, setDescricaoProduto] = useState('')
  const [precoVenda, setPrecoVenda] = useState('')
  const [unidadeProduto, setUnidadeProduto] = useState<string | null>(null)
  const [codigoEan, setCodigoEan] = useState('')
  const [produtoId, setProdutoId] = useState<string | null>(null)

  const { data: categorias = [], isLoading: loadingCategorias } = useGruposProdutos({
    limit: 500,
    ativo: true,
    enabled: open,
  })

  const resetState = useCallback(() => {
    setStep(0)
    setSaving(false)
    setModoCategoria('existente')
    setCategoriaId(null)
    setCategoriaNomeLabel('')
    setNovaCategoriaNome('')
    setCategoriaNovaPersistidaId(null)
    setNomeProduto('')
    setDescricaoProduto('')
    setPrecoVenda('')
    setUnidadeProduto(null)
    setCodigoEan('')
    setProdutoId(null)
    setKeepComplementos(false)
  }, [])

  useEffect(() => {
    if (open) resetState()
    else setKeepComplementos(false)
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

  const categoriaSelecionada = useMemo(
    () => categoriasUnicas.find((g: GrupoProduto) => g.getId() === categoriaId) ?? null,
    [categoriasUnicas, categoriaId]
  )

  const canAdvanceCategoria =
    modoCategoria === 'existente'
      ? Boolean(categoriaId)
      : novaCategoriaNome.trim().length > 0

  const canAdvanceProduto =
    canAdvanceCategoria &&
    nomeProduto.trim().length > 0 &&
    Boolean(precoVenda) &&
    parseFloat(precoVenda.replace(/[^\d,]/g, '').replace(',', '.')) > 0

  const invalidateMenu = useCallback(async () => {
    await invalidate(['menus'])
    await invalidate(['menu', menuId])
    await invalidate(['menu-produtos', menuId])
    await invalidate(['menu-grupos', menuId])
    await invalidate(['grupos-produtos'])
    await invalidate(['produtos'])
  }, [invalidate, menuId])

  const ensureCategoria = useCallback(async (): Promise<string | null> => {
    if (modoCategoria === 'existente') {
      if (!categoriaId) {
        showToast.error('Selecione uma categoria')
        return null
      }
      return categoriaId
    }

    // Já criada nesta sessão (retry do Concluir)
    if (categoriaNovaPersistidaId) return categoriaNovaPersistidaId

    const nome = novaCategoriaNome.trim()
    if (!nome) {
      showToast.error('Informe o nome da categoria')
      return null
    }

    const token = useAuthStore.getState().tenantAuth?.getAccessToken()
    if (!token) {
      showToast.error('Token não encontrado')
      return null
    }

    const response = await fetchGestorApi('/api/grupos-produtos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome: nome.toLocaleUpperCase('pt-BR'),
        ativo: true,
        corHex: '#530CA3',
        iconName: '',
        ativoDelivery: false,
        ativoLocal: false,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(
        (err as { message?: string }).message || 'Erro ao criar categoria'
      )
    }

    const payload = await response.json()
    const id = extrairIdDaResposta(payload)
    if (!id) throw new Error('Categoria criada, mas o id não foi retornado')

    setCategoriaNovaPersistidaId(id)
    setCategoriaId(id)
    setCategoriaNomeLabel(nome.toLocaleUpperCase('pt-BR'))
    await invalidate(['grupos-produtos'])
    return id
  }, [modoCategoria, categoriaId, categoriaNovaPersistidaId, novaCategoriaNome, invalidate])

  const createProduto = useCallback(
    async (grupoId: string, gruposComplementosIds: string[]): Promise<string | null> => {
      if (produtoId) return produtoId

      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return null
      }

      const precoVendaNum = parseFloat(
        precoVenda.replace(/[^\d,]/g, '').replace(',', '.')
      )
      if (!nomeProduto.trim()) {
        showToast.error('Informe o nome do produto')
        return null
      }
      if (!precoVenda || precoVendaNum <= 0) {
        showToast.error('Informe um preço de venda válido')
        return null
      }

      const response = await fetchGestorApi('/api/produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nome: nomeProduto.trim(),
          descricao: descricaoProduto.trim(),
          valor: precoVendaNum,
          grupoId,
          unidadeMedida: unidadeProduto,
          codigoEan: codigoEan.trim(),
          favorito: false,
          abreComplementos: true,
          permiteAcrescimo: true,
          permiteDesconto: true,
          permiteAlterarPreco: false,
          incideTaxa: false,
          gruposComplementosIds,
          impressorasIds: [],
          menuIds: [menuId],
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        const idJaCriado = extrairIdDaResposta(err)
        if (idJaCriado) {
          setProdutoId(idJaCriado)
          return idJaCriado
        }
        throw new Error(
          (err as { message?: string }).message || 'Erro ao cadastrar produto'
        )
      }

      const payload = await response.json()
      const id = extrairIdDaResposta(payload)
      if (!id) throw new Error('Produto criado, mas o id não foi retornado')
      setProdutoId(id)
      return id
    },
    [
      produtoId,
      precoVenda,
      nomeProduto,
      descricaoProduto,
      unidadeProduto,
      codigoEan,
      menuId,
    ]
  )

  const handleNextFromCategoria = useCallback(() => {
    if (!canAdvanceCategoria) {
      showToast.error(
        modoCategoria === 'nova' ? 'Informe o nome da categoria' : 'Selecione uma categoria'
      )
      return
    }
    if (modoCategoria === 'existente') {
      setCategoriaNomeLabel(categoriaSelecionada?.getNome() ?? categoriaNomeLabel)
    } else {
      setCategoriaNomeLabel(novaCategoriaNome.trim())
    }
    setStep(1)
  }, [
    canAdvanceCategoria,
    modoCategoria,
    categoriaSelecionada,
    categoriaNomeLabel,
    novaCategoriaNome,
  ])

  const handleNextFromProduto = useCallback(() => {
    if (!canAdvanceProduto) {
      showToast.error('Preencha os dados obrigatórios do produto')
      return
    }
    setKeepComplementos(true)
    setStep(2)
  }, [canAdvanceProduto])

  const finishWizard = useCallback(
    async (opts?: { skipComplementos?: boolean }) => {
      setSaving(true)
      const toastId = showToast.loading('Cadastrando produto no cardápio...')
      try {
        const grupoId = await ensureCategoria()
        if (!grupoId) {
          showToast.errorLoading(toastId, 'Não foi possível definir a categoria')
          return
        }

        const ids = opts?.skipComplementos
          ? []
          : (compsRef.current?.getSelectedIds() ?? [])

        const createdId = await createProduto(grupoId, ids)
        if (!createdId) {
          showToast.errorLoading(toastId, 'Não foi possível criar o produto')
          return
        }

        await invalidateMenu()
        showToast.successLoading(
          toastId,
          opts?.skipComplementos
            ? 'Produto disponível no cardápio'
            : 'Produto concluído no cardápio'
        )
        onClose()
      } catch (err) {
        showToast.errorLoading(
          toastId,
          err instanceof Error ? err.message : 'Erro ao finalizar cadastro'
        )
      } finally {
        setSaving(false)
      }
    },
    [ensureCategoria, createProduto, invalidateMenu, onClose]
  )

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (step === 0) {
      return {
        showCancel: true,
        cancelLabel: 'Fechar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showNext: true,
        nextLabel: 'Continuar',
        onNext: () => {
          handleNextFromCategoria()
        },
        nextDisabled: !canAdvanceCategoria || saving,
        showPrevious: false,
        barShowPrevNextIcons: true,
        barSecondaryTone: 'primaryMuted',
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
        onPrevious: () => setStep(0),
        previousDisabled: saving,
        showNext: true,
        nextLabel: 'Continuar',
        onNext: () => {
          handleNextFromProduto()
        },
        nextDisabled: !canAdvanceProduto || saving,
        barShowPrevNextIcons: true,
        barSecondaryTone: 'primaryMuted',
      }
    }
    return {
      showCancel: true,
      cancelLabel: 'Pular',
      cancelVariant: 'primaryTint10',
      onCancel: () => {
        void finishWizard({ skipComplementos: true })
      },
      cancelDisabled: saving,
      showPrevious: true,
      previousLabel: 'Anterior',
      onPrevious: () => setStep(1),
      previousDisabled: saving,
      showSave: true,
      saveLabel: 'Concluir',
      onSave: () => {
        void finishWizard()
      },
      saveLoading: saving,
      saveDisabled: saving,
      barShowPrevNextIcons: true,
      barSecondaryTone: 'primaryMuted',
      barActionOrder: ['prev', 'cancel', 'save'],
    }
  }, [
    step,
    onClose,
    handleNextFromCategoria,
    handleNextFromProduto,
    finishWizard,
    canAdvanceCategoria,
    canAdvanceProduto,
    saving,
  ])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Cadastrar produto neste cardápio"
      subtitle={
        menuNome ? (
          <span className="text-base font-medium normal-case"># {menuNome}</span>
        ) : undefined
      }
      scrollableBody={false}
      footerVariant="bar"
      panelClassName={MENU_SIDE_PANEL_CLASS}
      footerActions={footerActions}
    >
      <div className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 gap-1 border-b border-primary/20 bg-info px-2 pt-2 md:px-4">
          {STEP_LABELS.map((label, index) => {
            const active = step === index
            const done = step > index
            return (
              <div
                key={label}
                className={cn(
                  'flex-1 rounded-t-lg px-2 py-2 text-center text-xs font-semibold md:text-sm',
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
                  id="menu-wizard-categoria"
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
                    const { key, ...rest } = props as typeof props & { key?: React.Key }
                    return (
                      <li {...rest} key={grupo.getId()}>
                        {grupo.getNome()}
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
                      sx={{
                        ...sxEntradaCompactaProduto,
                        '& .MuiOutlinedInput-root': { backgroundColor: '#fff' },
                      }}
                    />
                  )}
                />
              ) : (
                <Input
                  label="Nome da categoria"
                  required
                  size="small"
                  value={novaCategoriaNome}
                  onChange={e => {
                    setNovaCategoriaNome(e.target.value.toLocaleUpperCase('pt-BR'))
                    setCategoriaNovaPersistidaId(null)
                  }}
                  placeholder="Ex.: PASTÉIS"
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                  InputLabelProps={{ required: true }}
                />
              )}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="rounded-[10px] bg-info p-2 md:p-4">
              <div className="mb-2 flex items-center gap-5">
                <h2 className="text-xl font-semibold text-primary">Produto</h2>
                <div className="h-px flex-1 bg-primary/70" />
              </div>
              <p className="mb-4 text-sm text-secondary-text">
                Preencha os dados do produto. Ele só será criado no cadastro e neste cardápio
                ao concluir o passo a passo.
                {categoriaNomeLabel || categoriaSelecionada || novaCategoriaNome
                  ? ` Categoria: ${categoriaNomeLabel || categoriaSelecionada?.getNome() || novaCategoriaNome}.`
                  : ''}
              </p>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <Input
                    label="Nome do Produto"
                    required
                    size="small"
                    value={nomeProduto}
                    onChange={e =>
                      setNomeProduto(e.target.value.toLocaleUpperCase('pt-BR'))
                    }
                    placeholder="Nome que Aparecerá no Jiffy POS"
                    className="bg-white"
                    sx={sxEntradaCompactaProduto}
                    InputLabelProps={{ required: true }}
                  />
                  <Input
                    label="Preço de Venda"
                    size="small"
                    value={precoVenda}
                    onChange={e => setPrecoVenda(formatCurrency(e.target.value))}
                    placeholder="R$ 0,00"
                    className="bg-white"
                    sx={sxEntradaCompactaProduto}
                  />
                </div>

                <Input
                  label="Descrição"
                  size="small"
                  value={descricaoProduto}
                  onChange={e => setDescricaoProduto(e.target.value)}
                  placeholder="Opcional"
                  className="bg-white"
                  sx={sxEntradaCompactaProduto}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormControl
                    fullWidth
                    size="small"
                    variant="outlined"
                    sx={sxEntradaCompactaProdutoSelect}
                  >
                    <InputLabel id="menu-wizard-unidade-label">Unidade</InputLabel>
                    <Select
                      labelId="menu-wizard-unidade-label"
                      label="Unidade"
                      value={unidadeProduto || ''}
                      onChange={e => setUnidadeProduto(e.target.value || null)}
                    >
                      <MenuItem value="">
                        <span className="text-secondary-text">Selecione</span>
                      </MenuItem>
                      {UNIDADES_MEDIDA_PRODUTO_OPCOES.map(opcao => (
                        <MenuItem key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Input
                    label="Código EAN"
                    size="small"
                    value={codigoEan}
                    onChange={e =>
                      setCodigoEan(e.target.value.replace(/\D/g, '').slice(0, 14))
                    }
                    placeholder="Opcional"
                    className="bg-white"
                    sx={sxEntradaCompactaProduto}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 || keepComplementos ? (
            <div
              className={cn(
                'flex h-full min-h-[320px] flex-col',
                step !== 2 && 'hidden'
              )}
            >
              <ComplementosMultiSelectDialog
                ref={compsRef}
                open={open}
                modoRascunho
                produtoNome={nomeProduto}
                isEmbedded
                onClose={() => undefined}
              />
            </div>
          ) : null}
        </div>

        {saving ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40">
            <JiffyLoading />
          </div>
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
