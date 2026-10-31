'use client'

import { useState } from 'react'
import { Checkbox } from '@mui/material'
import { PizzaCurrencyTextField } from '@/src/presentation/components/features/pizza/PizzaCurrencyTextField'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { buildPizzaComplementoPrecosSelecionados } from '@/src/application/pizza/pizzaComplementoImpacto'
import { showToast } from '@/src/shared/utils/toast'
import type { PrecoComplementoPizza, TipoImpactoPreco } from '@/src/shared/types/pizza'

const sxEntradaPrecoTamanho = {
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

export interface PizzaComplementoPrecoEditorProps {
  tamanhos: Array<{ id: string; nome: string }>
  precos: PrecoComplementoPizza[]
  tipoImpactoPreco: TipoImpactoPreco
  valorInicial?: number
  iniciarTodosSelecionados?: boolean
  pending: boolean
  onSave: (precos: PrecoComplementoPizza[]) => void | Promise<void>
  saveLabel?: string
}

export function PizzaComplementoPrecoEditor({
  tamanhos,
  precos,
  tipoImpactoPreco,
  valorInicial,
  iniciarTodosSelecionados = false,
  pending,
  onSave,
  saveLabel = 'Salvar preços',
}: PizzaComplementoPrecoEditorProps) {
  const [valores, setValores] = useState(() => {
    const existentes = new Map(precos.map(preco => [preco.pizzaTamanhoId, preco.valor]))
    return Object.fromEntries(
      tamanhos.map(tamanho => {
        const temPreco = existentes.has(tamanho.id)
        const valorBruto =
          tipoImpactoPreco === 'nenhum'
            ? 0
            : (existentes.get(tamanho.id) ?? valorInicial ?? 0)
        const valor = Number.isFinite(valorBruto) ? Math.max(0, valorBruto) : 0
        return [
          tamanho.id,
          {
            ativo: temPreco || iniciarTodosSelecionados,
            valor,
          },
        ]
      })
    )
  })

  const handleSalvar = async () => {
    const result = buildPizzaComplementoPrecosSelecionados({
      tamanhos,
      valores,
      tipoImpactoPreco,
    })
    if (!result.ok) {
      showToast.error(result.message)
      return
    }

    await onSave(result.precos)
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tamanhos.map(tamanho => {
          const valor = valores[tamanho.id]
          return (
            <div key={tamanho.id} className="flex items-center gap-1">
              <Checkbox
                size="small"
                checked={valor?.ativo ?? false}
                onChange={event =>
                  setValores(current => ({
                    ...current,
                    [tamanho.id]: {
                      ...current[tamanho.id],
                      ativo: event.target.checked,
                    },
                  }))
                }
                inputProps={{
                  'aria-label': `Habilitar preço ${tamanho.nome}`,
                }}
                sx={{ p: 0.5 }}
              />
              <PizzaCurrencyTextField
                size="small"
                fullWidth
                label={tamanho.nome}
                value={valor?.valor ?? 0}
                tipoImpactoPreco={tipoImpactoPreco}
                disabled={!valor?.ativo || tipoImpactoPreco === 'nenhum'}
                onChange={novoValor =>
                  setValores(current => {
                    const nextValor = Math.max(0, novoValor)
                    return {
                      ...current,
                      [tamanho.id]: {
                        ...current[tamanho.id],
                        valor: nextValor,
                        ativo: nextValor > 0 ? (current[tamanho.id]?.ativo ?? false) : false,
                      },
                    }
                  })
                }
                sx={sxEntradaPrecoTamanho}
              />
            </div>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => void handleSalvar()}
        disabled={pending || tamanhos.length === 0}
        className="h-8 shrink-0 rounded-lg bg-primary px-3 text-[0.8125rem] font-medium leading-none text-white disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[8.5rem]"
      >
        {pending ? 'Salvando...' : saveLabel}
      </button>
    </div>
  )
}
