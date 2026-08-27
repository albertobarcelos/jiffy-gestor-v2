'use client'

import { TextField } from '@mui/material'
import { ProdutoStatusSwitch } from '@/src/presentation/components/features/produtos/ProdutosList/ProdutoStatusSwitch'
import { Button } from '@/src/presentation/components/ui/button'
import { sxEntradaCompactaProduto } from '@/src/presentation/components/features/produtos/NovoProduto/produtoFormMuiSx'
import type { PizzaLinhaComplementoDraft } from './pizzaDefaults'
import { createLocalId } from './pizzaDefaults'

interface PizzaMassaBordaTableProps {
  labelNome: string
  labelAdicionar: string
  linhas: PizzaLinhaComplementoDraft[]
  onChange: (linhas: PizzaLinhaComplementoDraft[]) => void
}

export function PizzaMassaBordaTable({
  labelNome,
  labelAdicionar,
  linhas,
  onChange,
}: PizzaMassaBordaTableProps) {
  const atualizar = (localId: string, patch: Partial<PizzaLinhaComplementoDraft>) => {
    onChange(linhas.map(l => (l.localId === localId ? { ...l, ...patch } : l)))
  }

  const adicionar = () => {
    onChange([
      ...linhas,
      { localId: createLocalId(), nome: '', valor: 0, ativo: true },
    ])
  }

  const remover = (localId: string) => {
    if (linhas.length <= 1) return
    onChange(linhas.filter(l => l.localId !== localId))
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-secondary-text">
            <tr>
              <th className="px-3 py-2 font-medium">{labelNome}</th>
              <th className="px-3 py-2 font-medium">Preço</th>
              <th className="px-3 py-2 font-medium">Status de vendas</th>
              <th className="w-10 px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {linhas.map(linha => (
              <tr key={linha.localId} className="border-t border-gray-100">
                <td className="px-3 py-2">
                  <TextField
                    size="small"
                    fullWidth
                    value={linha.nome}
                    onChange={e => atualizar(linha.localId, { nome: e.target.value.toUpperCase() })}
                    placeholder={labelNome}
                    sx={sxEntradaCompactaProduto}
                  />
                </td>
                <td className="px-3 py-2">
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    value={Number.isFinite(linha.valor) ? linha.valor : 0}
                    onChange={e =>
                      atualizar(linha.localId, { valor: Number.parseFloat(e.target.value) || 0 })
                    }
                    sx={sxEntradaCompactaProduto}
                  />
                </td>
                <td className="px-3 py-2">
                  <ProdutoStatusSwitch
                    isAtivo={linha.ativo}
                    onChange={ativo => atualizar(linha.localId, { ativo })}
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs text-error hover:underline disabled:opacity-40"
                    disabled={linhas.length <= 1}
                    onClick={() => remover(linha.localId)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button type="button" variant="outlined" className="self-start border-primary text-primary" onClick={adicionar}>
        {labelAdicionar}
      </Button>
    </div>
  )
}
