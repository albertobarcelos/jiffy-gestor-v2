'use client'

import { TextField } from '@mui/material'
import { MdAdd, MdDeleteOutline } from 'react-icons/md'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { Button } from '@/src/presentation/components/ui/button'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import { cn } from '@/src/shared/utils/cn'
import type { PizzaTamanhoDraft } from './pizzaDefaults'
import { createLocalId, textoPedacos, textoSaboresTamanho } from './pizzaDefaults'
import { PizzaPedacosIcon } from './PizzaPedacosIcon'

const MAX_SABORES_OPCOES = [1, 2, 3, 4] as const
const MAX_SABORES_LIMITE = 4

interface PizzaTamanhoCardsProps {
  tamanhos: PizzaTamanhoDraft[]
  onChange: (tamanhos: PizzaTamanhoDraft[]) => void
  /** Quando informado, remove card e repassa item (para rastrear id no servidor). */
  onRemover?: (tamanho: PizzaTamanhoDraft & { id?: string }) => void
}

function clampMaxSabores(value: number) {
  return Math.min(MAX_SABORES_LIMITE, Math.max(1, value || 1))
}

export function PizzaTamanhoCards({ tamanhos, onChange, onRemover }: PizzaTamanhoCardsProps) {
  const atualizar = (localId: string, patch: Partial<PizzaTamanhoDraft>) => {
    onChange(tamanhos.map(t => (t.localId === localId ? { ...t, ...patch } : t)))
  }

  const adicionar = () => {
    onChange([
      ...tamanhos,
      {
        localId: createLocalId(),
        nome: '',
        quantidadePedacos: 8,
        quantidadeMaximaDivisoes: 2,
        ativo: true,
      },
    ])
  }

  const remover = (tamanho: PizzaTamanhoDraft & { id?: string }) => {
    if (tamanhos.length <= 1) return
    if (onRemover) {
      onRemover(tamanho)
      return
    }
    onChange(tamanhos.filter(t => t.localId !== tamanho.localId))
  }

  const podeRemover = tamanhos.length > 1

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div>
        <h2 className="text-sm font-semibold text-primary-text">Tamanhos</h2>
        <p className="mt-1 text-xs text-secondary-text">
          Indique aqui quais os tamanhos que suas pizzas são produzidas, em quantos pedaços são
          cortadas e até quantos sabores seu restaurante monta cada tamanho:
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {tamanhos.map(tamanho => {
          const maxSabores = clampMaxSabores(tamanho.quantidadeMaximaDivisoes)
          return (
            <article
              key={tamanho.localId}
              className={cn(
                'flex min-w-[220px] max-w-[240px] shrink-0 flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm',
                tamanho.ativo ? 'border-gray-200' : 'border-gray-100 opacity-70'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <PizzaPedacosIcon divisoes={maxSabores} size={40} />
                <div className="flex items-center gap-1">
                  {podeRemover ? (
                    <button
                      type="button"
                      className="rounded p-1 text-error hover:bg-error/10"
                      aria-label="Remover tamanho"
                      onClick={() => remover(tamanho as PizzaTamanhoDraft & { id?: string })}
                    >
                      <MdDeleteOutline size={18} />
                    </button>
                  ) : null}
                  <ProdutoStatusSwitch
                    isAtivo={tamanho.ativo}
                    onChange={ativo => atualizar(tamanho.localId, { ativo })}
                  />
                </div>
              </div>

              <TextField
                size="small"
                fullWidth
                label="Nome"
                value={tamanho.nome}
                onChange={e => atualizar(tamanho.localId, { nome: e.target.value.toUpperCase() })}
                sx={sxEntradaCompactaProduto}
              />

              <TextField
                size="small"
                type="number"
                fullWidth
                label="Pedaços"
                inputProps={{ min: 1 }}
                value={tamanho.quantidadePedacos}
                onChange={e =>
                  atualizar(tamanho.localId, {
                    quantidadePedacos: Number.parseInt(e.target.value, 10) || 1,
                  })
                }
                sx={sxEntradaCompactaProduto}
              />

              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium text-primary-text">Qtd. sabores</span>
                <div
                  className="flex items-center gap-2"
                  role="group"
                  aria-label="Quantidade máxima de sabores"
                >
                  {MAX_SABORES_OPCOES.map(opcao => {
                    const selected = maxSabores === opcao
                    return (
                      <button
                        key={opcao}
                        type="button"
                        onClick={() =>
                          atualizar(tamanho.localId, {
                            quantidadeMaximaDivisoes: opcao,
                          })
                        }
                        className={cn(
                          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                          'aspect-square p-0',
                          selected
                            ? 'bg-primary text-white'
                            : 'bg-[#D7E0EA] text-primary-text hover:bg-[#C5D0DC]'
                        )}
                        aria-pressed={selected}
                        aria-label={`${opcao} sabor${opcao > 1 ? 'es' : ''}`}
                      >
                        {opcao}
                      </button>
                    )
                  })}
                </div>
              </div>

              <p className="text-xs text-secondary-text">
                {textoPedacos(tamanho.quantidadePedacos)}
                <br />
                {textoSaboresTamanho(maxSabores)}
              </p>
            </article>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outlined"
        className="self-start border-primary text-primary"
        onClick={adicionar}
      >
        <MdAdd className="mr-1" /> Novo tamanho
      </Button>
    </div>
  )
}
