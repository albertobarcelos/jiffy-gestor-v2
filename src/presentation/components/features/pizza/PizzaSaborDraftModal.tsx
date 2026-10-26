'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Checkbox, FormControlLabel, TextField } from '@mui/material'
import {
  JiffySidePanelModal,
  type JiffySidePanelFooterActions,
} from '@/src/presentation/components/ui/jiffy-side-panel-modal'
import { MENU_WIDE_PANEL_CLASS } from '@/src/presentation/components/features/menus/menuPanelConstants'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { showToast } from '@/src/shared/utils/toast'
import { cn } from '@/src/shared/utils/cn'
import { PizzaCurrencyTextField } from './PizzaCurrencyTextField'
import {
  createLocalId,
  type PizzaSaborDraft,
  type PizzaSaborPrecoDraft,
  type PizzaTamanhoDraft,
} from './pizzaDefaults'

type SaborTab = 'detalhes' | 'preco'

interface PizzaSaborDraftModalProps {
  open: boolean
  categoriaNome: string
  tamanhos: PizzaTamanhoDraft[]
  initial?: PizzaSaborDraft | null
  onClose: () => void
  onSave: (sabor: PizzaSaborDraft) => void
}

function buildPrecosSelecionados(precos: Record<string, PizzaSaborPrecoDraft>) {
  return Object.entries(precos).filter(([, cfg]) => cfg.enabled && cfg.valor > 0)
}

export function PizzaSaborDraftModal({
  open,
  categoriaNome,
  tamanhos,
  initial = null,
  onClose,
  onSave,
}: PizzaSaborDraftModalProps) {
  const isEdit = Boolean(initial)
  const [tab, setTab] = useState<SaborTab>('detalhes')
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [precos, setPrecos] = useState<Record<string, PizzaSaborPrecoDraft>>({})
  const [session, setSession] = useState(0)

  const tamanhosAtivos = useMemo(
    () => tamanhos.filter(t => t.nome.trim() && t.ativo),
    [tamanhos]
  )
  const tamanhoIdsKey = useMemo(
    () => tamanhosAtivos.map(t => t.localId).join('|'),
    [tamanhosAtivos]
  )

  useEffect(() => {
    if (!open) return
    setTab('detalhes')
    setSession(s => s + 1)

    if (initial) {
      setNome(initial.nome)
      setDescricao(initial.descricao)
      setAtivo(initial.ativo)
      setPrecos({ ...initial.precosPorTamanhoLocalId })
      return
    }

    setNome('')
    setDescricao('')
    setAtivo(true)
    setPrecos({})
  }, [open, initial])

  useEffect(() => {
    if (!open || !tamanhoIdsKey) return
    setPrecos(prev => {
      let changed = false
      const next = { ...prev }
      for (const localId of tamanhoIdsKey.split('|')) {
        if (!localId || next[localId]) continue
        next[localId] = { enabled: true, valor: 0 }
        changed = true
      }
      return changed ? next : prev
    })
  }, [open, tamanhoIdsKey])

  const atualizarPreco = useCallback(
    (tamanhoLocalId: string, patch: Partial<PizzaSaborPrecoDraft>) => {
      setPrecos(prev => ({
        ...prev,
        [tamanhoLocalId]: {
          enabled: prev[tamanhoLocalId]?.enabled ?? true,
          valor: prev[tamanhoLocalId]?.valor ?? 0,
          ...patch,
        },
      }))
    },
    []
  )

  const podeContinuarDetalhes = nome.trim().length > 0
  const podeSalvar =
    podeContinuarDetalhes && buildPrecosSelecionados(precos).length > 0

  const handleSalvar = useCallback(() => {
    if (!podeSalvar) {
      showToast.error('Preencha nome e preço em ao menos um tamanho')
      return
    }

    onSave({
      localId: initial?.localId ?? createLocalId(),
      nome: nome.trim().toUpperCase(),
      descricao: descricao.trim(),
      ativo,
      precosPorTamanhoLocalId: precos,
    })
    onClose()
  }, [ativo, descricao, initial?.localId, nome, onClose, onSave, podeSalvar, precos])

  const footerActions = useMemo((): JiffySidePanelFooterActions => {
    if (tab === 'detalhes') {
      return {
        showCancel: true,
        cancelLabel: 'Cancelar',
        cancelVariant: 'dangerOutline',
        onCancel: onClose,
        showNext: true,
        nextLabel: 'Continuar',
        nextDisabled: !podeContinuarDetalhes,
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
      saveLabel: isEdit ? 'Atualizar' : 'Adicionar',
      saveDisabled: !podeSalvar,
      onSave: handleSalvar,
      barEqualNavAndSave: true,
      barSecondaryTone: 'primary',
      barActionOrder: ['cancel', 'prev', 'save'],
    }
  }, [handleSalvar, isEdit, onClose, podeContinuarDetalhes, podeSalvar, tab])

  return (
    <JiffySidePanelModal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar sabor' : 'Novo sabor'}
      zIndex={1400}
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
              value={categoriaNome}
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
            {tamanhosAtivos.length === 0 ? (
              <p className="text-sm text-error">
                Configure os tamanhos da categoria antes de cadastrar sabores.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tamanhosAtivos.map(tamanho => {
                  const cfg = precos[tamanho.localId] ?? { enabled: false, valor: 0 }
                  return (
                    <div
                      key={tamanho.localId}
                      className="rounded-xl border border-gray-200 p-4"
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={cfg.enabled}
                            onChange={e =>
                              atualizarPreco(tamanho.localId, {
                                enabled: e.target.checked,
                              })
                            }
                          />
                        }
                        label={tamanho.nome}
                      />
                      <PizzaCurrencyTextField
                        key={tamanho.localId}
                        size="small"
                        fullWidth
                        label="Preço"
                        disabled={!cfg.enabled}
                        value={cfg.valor}
                        onChange={valor => atualizarPreco(tamanho.localId, { valor })}
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
