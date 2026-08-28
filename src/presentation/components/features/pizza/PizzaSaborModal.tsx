'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Checkbox, FormControlLabel, TextField } from '@mui/material'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import { useMenus } from '@/src/presentation/hooks/menus/useMenus'
import { useInvalidateTenantQueries } from '@/src/presentation/hooks/useInvalidateTenantQueries'
import {
  vincularSaboresPizzaAoMenu,
  vincularSaborAosMenusDaCategoria,
} from '@/src/presentation/utils/pizza/vincularPizzaCategoriaMenus'
import {
  useAtualizarPizzaSaborMutation,
  useCriarPizzaSaborMutation,
  usePizzaSabor,
  usePizzaTamanhos,
} from '@/src/presentation/hooks/pizza/usePizza'
import type { CategoriaPizza } from '@/src/shared/types/pizza'
import { PizzaCurrencyTextField } from './PizzaCurrencyTextField'

type SaborTab = 'detalhes' | 'preco'

type PrecoTamanhoCfg = { enabled: boolean; valor: number }

const EMPTY_TAMANHOS: never[] = []

function patchPrecoTamanho(
  prev: Record<string, PrecoTamanhoCfg>,
  tamanhoId: string,
  patch: Partial<PrecoTamanhoCfg>,
  fallback: PrecoTamanhoCfg
): Record<string, PrecoTamanhoCfg> {
  return {
    ...prev,
    [tamanhoId]: {
      ...(prev[tamanhoId] ?? fallback),
      ...patch,
    },
  }
}

function buildPrecosSelecionados(precos: Record<string, PrecoTamanhoCfg>) {
  return Object.entries(precos)
    .filter(([, cfg]) => cfg.enabled && cfg.valor > 0)
    .map(([pizzaTamanhoId, cfg]) => ({
      pizzaTamanhoId,
      precoCheio: cfg.valor,
    }))
}

interface PizzaSaborModalProps {
  open: boolean
  categoria: CategoriaPizza | null
  saborId?: string | null
  menuId?: string
  onClose: () => void
  onSuccess?: () => void
}

export function PizzaSaborModal({
  open,
  categoria,
  saborId = null,
  menuId,
  onClose,
  onSuccess,
}: PizzaSaborModalProps) {
  const isEdit = Boolean(saborId)
  const [tab, setTab] = useState<SaborTab>('detalhes')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [precos, setPrecos] = useState<Record<string, PrecoTamanhoCfg>>({})
  const [session, setSession] = useState(0)
  const saborHydratedRef = useRef<string | null>(null)

  const categoriaId = categoria?.id
  const { data: saborDetalhe, isLoading: loadingSabor } = usePizzaSabor(
    saborId ?? undefined,
    open && isEdit
  )
  const { data: tamanhosData, isLoading: loadingTamanhos } = usePizzaTamanhos(categoriaId, open)
  const tamanhos = tamanhosData?.items ?? EMPTY_TAMANHOS
  const tamanhoIdsKey = useMemo(
    () => tamanhos.map(t => t.id).join('|'),
    [tamanhos]
  )
  const novoPrecoFallback = useMemo<PrecoTamanhoCfg>(
    () => ({ enabled: true, valor: 0 }),
    []
  )
  const editPrecoFallback = useMemo<PrecoTamanhoCfg>(
    () => ({ enabled: false, valor: 0 }),
    []
  )
  const criarMutation = useCriarPizzaSaborMutation()
  const atualizarMutation = useAtualizarPizzaSaborMutation()
  const invalidate = useInvalidateTenantQueries()
  const { data: menusData } = useMenus({ limit: 100, ativo: true, enabled: open && !menuId })
  const menuIdsCandidatos = useMemo(
    () => (menusData?.items ?? []).map(menu => menu.id),
    [menusData?.items]
  )

  const sincronizarSaborComMenus = useCallback(
    async (novoSaborId: string) => {
      const token = useAuthStore.getState().tenantAuth?.getAccessToken()
      if (!token || !categoriaId) return

      if (menuId) {
        await vincularSaboresPizzaAoMenu(token, menuId, [novoSaborId])
        await invalidate(['menu', menuId])
        await invalidate(['menu-produtos', menuId])
        await invalidate(['menu-grupos', menuId])
        return
      }

      if (menuIdsCandidatos.length === 0) return
      await vincularSaborAosMenusDaCategoria(
        token,
        categoriaId,
        novoSaborId,
        menuIdsCandidatos
      )
    },
    [categoriaId, invalidate, menuId, menuIdsCandidatos]
  )

  useEffect(() => {
    if (!open) return
    setTab('detalhes')
    setSession(s => s + 1)
    saborHydratedRef.current = null

    if (!isEdit) {
      setNome('')
      setDescricao('')
      setAtivo(true)
      setPrecos({})
    }
  }, [open, isEdit, saborId])

  useEffect(() => {
    if (!open || !isEdit || !saborDetalhe) return
    if (saborHydratedRef.current === saborDetalhe.id) return

    saborHydratedRef.current = saborDetalhe.id
    setNome(saborDetalhe.nome)
    setDescricao(saborDetalhe.descricao ?? '')
    setAtivo(saborDetalhe.ativo)
    const map: Record<string, PrecoTamanhoCfg> = {}
    saborDetalhe.precosTamanho.forEach(p => {
      map[p.pizzaTamanhoId] = {
        enabled: p.precoCheio > 0,
        valor: p.precoCheio,
      }
    })
    setPrecos(map)
  }, [open, isEdit, saborDetalhe])

  useEffect(() => {
    if (!open || !tamanhoIdsKey) return

    const fallback = isEdit ? editPrecoFallback : novoPrecoFallback

    setPrecos(prev => {
      let changed = false
      const next = { ...prev }

      for (const tamanhoId of tamanhoIdsKey.split('|')) {
        if (!tamanhoId || next[tamanhoId]) continue
        next[tamanhoId] = { ...fallback }
        changed = true
      }

      return changed ? next : prev
    })
  }, [open, isEdit, tamanhoIdsKey, editPrecoFallback, novoPrecoFallback])

  const atualizarPrecoTamanho = useCallback(
    (tamanhoId: string, patch: Partial<PrecoTamanhoCfg>) => {
      setPrecos(prev =>
        patchPrecoTamanho(
          prev,
          tamanhoId,
          patch,
          isEdit ? editPrecoFallback : novoPrecoFallback
        )
      )
    },
    [editPrecoFallback, isEdit, novoPrecoFallback]
  )

  const podeContinuarDetalhes = nome.trim().length > 0
  const precosSelecionados = useMemo(
    () => buildPrecosSelecionados(precos),
    [precos]
  )
  const podeSalvar = podeContinuarDetalhes && precosSelecionados.length > 0
  const saving = criarMutation.isPending || atualizarMutation.isPending

  const handleSalvar = useCallback(async () => {
    if (!categoriaId) return

    const selecionados = buildPrecosSelecionados(precos)
    const podeSalvarAgora = nome.trim().length > 0 && selecionados.length > 0

    if (!podeSalvarAgora) {
      showToast.error('Preencha nome e preço em ao menos um tamanho')
      return
    }

    try {
      if (isEdit && saborId) {
        await atualizarMutation.mutateAsync({
          id: saborId,
          categoriaPizzaId: categoriaId,
          patch: {
            nome: nome.trim(),
            descricao: descricao.trim() || null,
            ativo,
            precosTamanho: selecionados,
          },
        })

        showToast.success('Sabor atualizado')
      } else {
        const criado = await criarMutation.mutateAsync({
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          ativo,
          categoriaPizzaId: categoriaId,
          precosTamanho: selecionados,
        })
        if (criado.id) {
          await sincronizarSaborComMenus(criado.id)
        }
        showToast.success('Sabor criado')
      }
      onSuccess?.()
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar sabor')
    }
  }, [
    ativo,
    atualizarMutation,
    categoriaId,
    criarMutation,
    descricao,
    isEdit,
    nome,
    onClose,
    onSuccess,
    precos,
    saborId,
    sincronizarSaborComMenus,
  ])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (tab === 'detalhes') {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'dangerOutline',
        onCancel: onClose,
        showNext: true,
        nextLabel: 'Continuar',
        nextDisabled: !podeContinuarDetalhes || (isEdit && loadingSabor),
        onNext: () => setTab('preco'),
        barSecondaryTone: 'primary',
        barActionOrder: ['cancel', 'next'],
      }
    }

    return {
      showPrevious: true,
      previousLabel: 'Anterior',
      onPrevious: () => setTab('detalhes'),
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'dangerOutline',
      onCancel: onClose,
      showSave: true,
      saveLabel: 'Salvar',
      saveDisabled: !podeSalvar || saving,
      saveLoading: saving,
      onSave: () => void handleSalvar(),
      barEqualNavAndSave: true,
      barSecondaryTone: 'primary',
      barActionOrder: ['cancel', 'prev', 'save'],
    }
  }, [
    handleSalvar,
    isEdit,
    loadingSabor,
    onClose,
    podeContinuarDetalhes,
    podeSalvar,
    saving,
    tab,
  ])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar sabor' : 'Sabor da pizza'}
      panelClassName={MENU_WIDE_PANEL_CLASS}
      footerVariant="bar"
      footerActions={footerActions}
    >
      <div key={session} className="flex min-h-0 flex-1 flex-col">
        {isEdit && loadingSabor ? (
          <JiffyLoading text="Carregando sabor..." />
        ) : (
          <>
            <nav className="flex gap-6 border-b border-gray-200 px-4 md:px-6">
              {(['detalhes', 'preco'] as const).map(id => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    '-mb-px border-b-2 pb-3 text-sm font-medium capitalize',
                    tab === id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-secondary-text'
                  )}
                >
                  {id === 'detalhes' ? 'Detalhes' : 'Preço'}
                </button>
              ))}
            </nav>

            {tab === 'detalhes' ? (
              <div className="flex flex-col gap-4 p-4 md:p-6">
                <TextField
                  label="Categoria"
                  fullWidth
                  value={categoria?.nome ?? ''}
                  disabled
                  sx={sxEntradaCompactaProduto}
                />
                <TextField
                  label="Sabor"
                  required
                  fullWidth
                  value={nome}
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  inputProps={{ maxLength: 80 }}
                  helperText={`${nome.length}/80 caracteres`}
                  sx={sxEntradaCompactaProduto}
                />
                <TextField
                  label="Descrição"
                  fullWidth
                  multiline
                  minRows={3}
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  inputProps={{ maxLength: 1000 }}
                  helperText={`${descricao.length}/1000 caracteres`}
                  placeholder="Ingredientes do sabor..."
                  sx={sxEntradaCompactaProduto}
                />
              </div>
            ) : null}

            {tab === 'preco' ? (
              <div className="flex flex-col gap-4 p-4 md:p-6">
                <p className="text-sm text-secondary-text">
                  Selecione os tamanhos disponíveis e informe o preço de cada um.
                </p>
                {loadingTamanhos ? (
                  <p className="text-sm text-secondary-text">Carregando tamanhos...</p>
                ) : tamanhos.length === 0 ? (
                  <p className="text-sm text-error">
                    Configure os tamanhos da categoria antes de cadastrar sabores.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {tamanhos.map(tamanho => {
                      const cfg = precos[tamanho.id] ?? { enabled: false, valor: 0 }
                      return (
                        <div
                          key={tamanho.id}
                          className="rounded-xl border border-gray-200 p-4"
                        >
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={cfg.enabled}
                                onChange={e =>
                                  atualizarPrecoTamanho(tamanho.id, {
                                    enabled: e.target.checked,
                                  })
                                }
                              />
                            }
                            label={tamanho.nome}
                          />
                          <PizzaCurrencyTextField
                            key={tamanho.id}
                            size="small"
                            fullWidth
                            label="Preço"
                            disabled={!cfg.enabled}
                            value={cfg.valor}
                            onChange={valor => atualizarPrecoTamanho(tamanho.id, { valor })}
                            sx={sxEntradaCompactaProduto}
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </JiffySidePanelModal>
  )
}
