'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Checkbox, TextField } from '@mui/material'
import { Button } from '@/src/presentation/components/ui/button'
import { UppercaseLocaleInput } from '@/src/presentation/components/ui/UppercaseLocaleInput'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { showToast } from '@/src/shared/utils/toast'
import { PizzaCurrencyTextField } from './PizzaCurrencyTextField'
import {
  createLocalId,
  type PizzaSaborDraft,
  type PizzaSaborPrecoDraft,
  type PizzaTamanhoDraft,
} from './pizzaDefaults'

const sxEntradaCardSabor = {
  ...sxEntradaCompactaProduto,
  '& .MuiOutlinedInput-root': {
    height: 32,
  },
  '& .MuiOutlinedInput-input': {
    padding: '0 8px',
    fontSize: '0.8125rem',
    height: '100%',
    boxSizing: 'border-box',
  },
  '& .MuiInputLabel-root': {
    color: 'var(--color-primary-text)',
    fontSize: '0.8125rem',
  },
  '& .MuiInputLabel-root:not(.MuiInputLabel-shrink)': {
    transform: 'translate(12px, 6px) scale(1)',
  },
} as const

const sxBotaoCardSabor = {
  height: 32,
  minHeight: '32px !important',
  maxHeight: 32,
  px: 1.5,
  py: '0 !important',
  lineHeight: 1,
  fontSize: '0.8125rem',
  boxSizing: 'border-box',
} as const

export type PizzaSaborFormLeaveResult = 'idle' | 'committed' | 'incomplete'

export interface PizzaSaborDraftFormCardHandle {
  tryCommitOnLeave: () => PizzaSaborFormLeaveResult
}

interface PizzaSaborDraftFormCardProps {
  tamanhos: PizzaTamanhoDraft[]
  initial?: PizzaSaborDraft | null
  onSave: (sabor: PizzaSaborDraft) => void
  onCancel: () => void
}

function buildPrecosSelecionados(precos: Record<string, PizzaSaborPrecoDraft>) {
  return Object.entries(precos).filter(([, cfg]) => cfg.enabled && cfg.valor > 0)
}

function isFormVazio(
  nome: string,
  descricao: string,
  precos: Record<string, PizzaSaborPrecoDraft>,
  tamanhosAtivos: PizzaTamanhoDraft[]
) {
  if (nome.trim() || descricao.trim()) return false
  return tamanhosAtivos.every(t => (precos[t.localId]?.valor ?? 0) <= 0)
}

function isFormCompletoParaContinuar(
  nome: string,
  precos: Record<string, PizzaSaborPrecoDraft>,
  tamanhosAtivos: PizzaTamanhoDraft[]
) {
  if (!nome.trim() || tamanhosAtivos.length === 0) return false
  return tamanhosAtivos.every(t => {
    const cfg = precos[t.localId]
    return Boolean(cfg?.enabled && cfg.valor > 0)
  })
}

export const PizzaSaborDraftFormCard = forwardRef<
  PizzaSaborDraftFormCardHandle,
  PizzaSaborDraftFormCardProps
>(function PizzaSaborDraftFormCard({ tamanhos, initial = null, onSave, onCancel }, ref) {
  const isEdit = Boolean(initial)
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [ativo, setAtivo] = useState(true)
  const [precos, setPrecos] = useState<Record<string, PizzaSaborPrecoDraft>>({})

  const tamanhosAtivos = useMemo(
    () => tamanhos.filter(t => t.nome.trim() && t.ativo),
    [tamanhos]
  )
  const tamanhoIdsKey = useMemo(
    () => tamanhosAtivos.map(t => t.localId).join('|'),
    [tamanhosAtivos]
  )
  const formKey = initial?.localId ?? 'novo'

  useEffect(() => {
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
  }, [formKey, initial])

  useEffect(() => {
    if (!tamanhoIdsKey) return
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
  }, [tamanhoIdsKey, formKey])

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

  const buildSabor = useCallback((): PizzaSaborDraft => {
    return {
      localId: initial?.localId ?? createLocalId(),
      nome: nome.trim().toUpperCase(),
      descricao: descricao.trim(),
      ativo,
      precosPorTamanhoLocalId: precos,
    }
  }, [ativo, descricao, initial?.localId, nome, precos])

  const podeSalvar =
    nome.trim().length > 0 && buildPrecosSelecionados(precos).length > 0

  const handleSalvar = () => {
    if (!podeSalvar) {
      showToast.error('Preencha nome e preço em ao menos um tamanho')
      return
    }

    onSave(buildSabor())
  }

  useImperativeHandle(
    ref,
    () => ({
      tryCommitOnLeave: () => {
        if (isFormVazio(nome, descricao, precos, tamanhosAtivos)) {
          return 'idle'
        }
        if (!isFormCompletoParaContinuar(nome, precos, tamanhosAtivos)) {
          showToast.error(
            'Preencha o nome do sabor e o preço de todos os tamanhos antes de continuar'
          )
          return 'incomplete'
        }
        onSave(buildSabor())
        return 'committed'
      },
    }),
    [buildSabor, descricao, nome, onSave, precos, tamanhosAtivos]
  )

  return (
    <div className="rounded-xl border border-primary/30 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-primary-text">
        {isEdit ? 'Editar sabor' : 'Novo sabor'}
      </h3>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2 sm:grid-cols-2">
          <UppercaseLocaleInput
            label="Sabor"
            required
            fullWidth
            size="small"
            value={nome}
            onValueChange={setNome}
            maxLength={80}
            sx={sxEntradaCardSabor}
          />
          <TextField
            label="Descrição"
            fullWidth
            size="small"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            inputProps={{ maxLength: 1000 }}
            placeholder="Ingredientes do sabor..."
            sx={sxEntradaCardSabor}
          />
        </div>

        <Button
          type="button"
          variant="contained"
          size="small"
          disabled={!podeSalvar}
          onClick={handleSalvar}
          className="sm:min-w-[7.5rem]"
          sx={{
            ...sxBotaoCardSabor,
            backgroundColor: 'var(--color-primary)',
            color: '#fff',
            '&:hover': {
              backgroundColor: 'var(--color-primary)',
              filter: 'brightness(0.92)',
            },
            '&.Mui-disabled': {
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              opacity: 0.5,
            },
          }}
        >
          {isEdit ? 'Salvar' : 'Adicionar'}
        </Button>

        <div className="min-w-0">
          {tamanhosAtivos.length === 0 ? (
            <p className="text-sm text-error">
              Configure os tamanhos da categoria antes de cadastrar sabores.
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {tamanhosAtivos.map(tamanho => {
                const cfg = precos[tamanho.localId] ?? { enabled: false, valor: 0 }
                return (
                  <div key={tamanho.localId} className="flex items-center gap-1">
                    <Checkbox
                      size="small"
                      checked={cfg.enabled}
                      onChange={e =>
                        atualizarPreco(tamanho.localId, {
                          enabled: e.target.checked,
                        })
                      }
                      inputProps={{
                        'aria-label': `Habilitar preço ${tamanho.nome}`,
                      }}
                      sx={{ p: 0.5 }}
                    />
                    <PizzaCurrencyTextField
                      key={`${formKey}-${tamanho.localId}`}
                      size="small"
                      fullWidth
                      label={tamanho.nome}
                      disabled={!cfg.enabled}
                      value={cfg.valor}
                      onChange={valor => atualizarPreco(tamanho.localId, { valor })}
                      sx={sxEntradaCardSabor}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outlined"
          color="error"
          size="small"
          onClick={onCancel}
          className="sm:min-w-[7.5rem]"
          sx={sxBotaoCardSabor}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
})
