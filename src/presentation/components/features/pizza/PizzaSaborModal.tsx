'use client'

import { useEffect, useMemo, useState } from 'react'
import { Checkbox, FormControlLabel, TextField } from '@mui/material'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import {
  useCriarPizzaSaborMutation,
  usePizzaTamanhos,
} from '@/src/presentation/hooks/pizza/usePizza'
import type { CategoriaPizza } from '@/src/shared/types/pizza'

type SaborTab = 'detalhes' | 'preco'

interface PizzaSaborModalProps {
  open: boolean
  categoria: CategoriaPizza | null
  onClose: () => void
  onSuccess?: () => void
}

export function PizzaSaborModal({ open, categoria, onClose, onSuccess }: PizzaSaborModalProps) {
  const [tab, setTab] = useState<SaborTab>('detalhes')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [precos, setPrecos] = useState<Record<string, { enabled: boolean; valor: number }>>({})
  const [session, setSession] = useState(0)

  const categoriaId = categoria?.id
  const { data: tamanhosData, isLoading: loadingTamanhos } = usePizzaTamanhos(categoriaId, open)
  const tamanhos = tamanhosData?.items ?? []
  const criarMutation = useCriarPizzaSaborMutation()

  useEffect(() => {
    if (open) {
      setTab('detalhes')
      setNome('')
      setDescricao('')
      setAtivo(true)
      setSession(s => s + 1)
    }
  }, [open])

  useEffect(() => {
    if (!open || tamanhos.length === 0) return
    setPrecos(prev => {
      const next = { ...prev }
      tamanhos.forEach(t => {
        if (!next[t.id]) {
          next[t.id] = { enabled: true, valor: 0 }
        }
      })
      return next
    })
  }, [open, tamanhos])

  const podeContinuarDetalhes = nome.trim().length > 0
  const precosSelecionados = useMemo(
    () =>
      Object.entries(precos)
        .filter(([, cfg]) => cfg.enabled && cfg.valor > 0)
        .map(([pizzaTamanhoId, cfg]) => ({
          pizzaTamanhoId,
          precoCheio: cfg.valor,
        })),
    [precos]
  )
  const podeSalvar = podeContinuarDetalhes && precosSelecionados.length > 0

  const handleSalvar = async () => {
    if (!categoriaId) return
    if (!podeSalvar) {
      showToast.error('Preencha nome e preço em ao menos um tamanho')
      return
    }

    try {
      await criarMutation.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        ativo,
        categoriaPizzaId: categoriaId,
        precosTamanho: precosSelecionados,
      })
      showToast.success('Sabor criado')
      onSuccess?.()
      onClose()
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Erro ao salvar sabor')
    }
  }

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (tab === 'detalhes') {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'primaryTint10',
        onCancel: onClose,
        showNext: true,
        nextLabel: 'Continuar',
        nextDisabled: !podeContinuarDetalhes,
        onNext: () => setTab('preco'),
        barSecondaryTone: 'primaryMuted',
        barActionOrder: ['cancel', 'next'],
      }
    }

    return {
      showPrevious: true,
      previousLabel: 'Anterior',
      onPrevious: () => setTab('detalhes'),
      showCancel: true,
      cancelLabel: 'Cancelar',
      cancelVariant: 'primaryTint10',
      onCancel: onClose,
      showSave: true,
      saveLabel: 'Salvar',
      saveDisabled: !podeSalvar || criarMutation.isPending,
      saveLoading: criarMutation.isPending,
      onSave: () => void handleSalvar(),
      barSecondaryTone: 'primaryMuted',
      barActionOrder: ['cancel', 'prev', 'save'],
    }
  }, [criarMutation.isPending, onClose, podeContinuarDetalhes, podeSalvar, tab])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title="Sabor da pizza"
      panelClassName={MENU_WIDE_PANEL_CLASS}
      footerVariant="bar"
      footerActions={footerActions}
    >
      <div key={session} className="flex min-h-0 flex-1 flex-col">
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
                              setPrecos(prev => ({
                                ...prev,
                                [tamanho.id]: {
                                  ...cfg,
                                  enabled: e.target.checked,
                                },
                              }))
                            }
                          />
                        }
                        label={tamanho.nome}
                      />
                      <TextField
                        size="small"
                        fullWidth
                        type="number"
                        label="Preço"
                        disabled={!cfg.enabled}
                        inputProps={{ min: 0, step: 0.01 }}
                        value={cfg.valor}
                        onChange={e =>
                          setPrecos(prev => ({
                            ...prev,
                            [tamanho.id]: {
                              ...cfg,
                              valor: Number.parseFloat(e.target.value) || 0,
                            },
                          }))
                        }
                        sx={sxEntradaCompactaProduto}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </JiffySidePanelModal>
  )
}
