'use client'

import { TextField } from '@mui/material'
import { Button } from '@/src/presentation/components/ui/button'
import { JiffyIconSwitch } from '@/src/presentation/components/ui/JiffyIconSwitch'
import { cn } from '@/src/shared/utils/cn'
import type { PizzaLinhaComplementoDraft } from './pizzaDefaults'
import { createLocalId } from './pizzaDefaults'
import { PizzaCurrencyTextField } from './PizzaCurrencyTextField'

const sxEntradaFina = {
  '& .MuiOutlinedInput-input': {
    padding: '6px 8px',
    fontSize: '0.75rem',
    lineHeight: 1.25,
  },
  '& .MuiOutlinedInput-root': {
    minHeight: 32,
  },
} as const

interface PizzaMassaBordaTableProps {
  labelNome: string
  labelAdicionar: string
  linhas: PizzaLinhaComplementoDraft[]
  onChange: (linhas: PizzaLinhaComplementoDraft[]) => void
  onRemover?: (linha: PizzaLinhaComplementoDraft & { id?: string }) => void
  className?: string
}

export function PizzaMassaBordaTable({
  labelNome,
  labelAdicionar,
  linhas,
  onChange,
  onRemover,
  className,
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

  const remover = (linha: PizzaLinhaComplementoDraft & { id?: string }) => {
    if (linhas.length <= 1) return
    if (onRemover) {
      onRemover(linha)
      return
    }
    onChange(linhas.filter(l => l.localId !== linha.localId))
  }

  return (
    <div className={cn('flex flex-col gap-2 p-4 md:p-6', className)}>
      {/* ~4 linhas (input 32px + py) antes de scroll interno */}
      <div className="max-h-[168px] overflow-x-auto overflow-y-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <tbody>
            {linhas.map((linha, index) => (
              <tr
                key={linha.localId}
                className={cn(index > 0 && 'border-t border-gray-100')}
              >
                <td className="px-2 py-1">
                  <TextField
                    size="small"
                    fullWidth
                    value={linha.nome}
                    onChange={e => atualizar(linha.localId, { nome: e.target.value.toUpperCase() })}
                    placeholder={labelNome}
                    sx={sxEntradaFina}
                  />
                </td>
                <td className="px-2 py-1">
                  <PizzaCurrencyTextField
                    size="small"
                    value={Number.isFinite(linha.valor) ? linha.valor : 0}
                    onChange={valor => atualizar(linha.localId, { valor })}
                    sx={sxEntradaFina}
                  />
                </td>
                <td className="px-2 py-1">
                  <JiffyIconSwitch
                    checked={linha.ativo}
                    onChange={e => atualizar(linha.localId, { ativo: e.target.checked })}
                    size="xs"
                    bordered={false}
                    className="shrink-0 px-0 py-0"
                    inputProps={{
                      'aria-label': linha.ativo ? 'Desativar' : 'Ativar',
                    }}
                  />
                </td>
                <td className="px-2 py-1">
                  <button
                    type="button"
                    className="text-xs text-error hover:underline disabled:opacity-40"
                    disabled={linhas.length <= 1}
                    onClick={() => remover(linha as PizzaLinhaComplementoDraft & { id?: string })}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="contained"
        fullWidth
        size="small"
        onClick={adicionar}
        sx={{
          backgroundColor: 'var(--color-primary)',
          color: '#fff',
          py: 1,
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
        {labelAdicionar}
      </Button>
    </div>
  )
}
