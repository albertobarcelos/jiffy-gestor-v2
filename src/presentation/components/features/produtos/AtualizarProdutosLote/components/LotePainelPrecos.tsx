'use client'

import { Button } from '@/src/presentation/components/ui/button'
import { Input } from '@/src/presentation/components/ui/input'
import { Checkbox } from '@/src/presentation/components/ui/checkbox'
import type { AjustePrecoDirecao, AjustePrecoModo } from '../rules/precoLote.rules'

export interface LotePainelPrecosProps {
  adjustMode: AjustePrecoModo
  setAdjustMode: (mode: AjustePrecoModo) => void
  adjustAmount: string
  setAdjustAmount: (value: string) => void
  adjustDirection: AjustePrecoDirecao
  setAdjustDirection: (direction: AjustePrecoDirecao) => void
  isUpdating: boolean
  isSalvandoPermissoes: boolean
  isSalvandoFiscal: boolean
  produtosSelecionadosCount: number
  onAplicar: () => void
}

export function LotePainelPrecos({
  adjustMode,
  setAdjustMode,
  adjustAmount,
  setAdjustAmount,
  adjustDirection,
  setAdjustDirection,
  isUpdating,
  isSalvandoPermissoes,
  isSalvandoFiscal,
  produtosSelecionadosCount,
  onAplicar,
}: LotePainelPrecosProps) {
  const checkboxSx = {
    color: 'var(--color-primary)',
    '&.Mui-checked': { color: 'var(--color-primary)' },
  }

  return (
    <>
      <div className="flex flex-wrap md:gap-4 gap-1 items-end">
        <div className="w-full sm:w-[150px]">
          <label className="block text-xs font-semibold text-secondary-text mb-1">
            Tipo de ajuste
          </label>
          <select
            value={adjustMode}
            onChange={(e) => setAdjustMode(e.target.value as AjustePrecoModo)}
            className="w-full h-8 px-4 rounded-lg border border-primary/70 bg-white text-sm font-nunito focus:outline-none focus:border-primary"
          >
            <option value="valor">Valor (R$)</option>
            <option value="percentual">Porcent. (%)</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="flex items-center gap-1 text-sm font-semibold text-primary-text">
            <Checkbox
              checked={adjustDirection === 'increase'}
              onChange={() => setAdjustDirection('increase')}
              sx={checkboxSx}
            />
            ( + )
          </label>
          <label className="flex items-center gap-1 text-sm font-semibold text-primary-text">
            <Checkbox
              checked={adjustDirection === 'decrease'}
              onChange={() => setAdjustDirection('decrease')}
              sx={checkboxSx}
            />
            ( - )
          </label>
        </div>

        <div className="flex-1 flex flex-row justify-between items-end gap-2 w-full md:max-w-[350px]">
          <div className="flex flex-col gap-1 w-full">
            <label className="block text-xs font-semibold text-secondary-text">
              {adjustDirection === 'increase' ? 'Aumentar' : 'Diminuir'} (
              {adjustMode === 'valor' ? 'R$' : '%'})
            </label>
            <Input
              className="rounded-lg"
              type="text"
              value={adjustAmount}
              onChange={(e) => {
                const value = e.target.value.replace(/[^\d,.-]/g, '')
                setAdjustAmount(value)
              }}
              placeholder={adjustMode === 'valor' ? '0,00' : '0'}
              InputProps={{
                sx: {
                  border: '1px solid',
                  borderColor: 'var(--color-primary)',
                  backgroundColor: 'var(--color-info)',
                  height: 32,
                  '&.Mui-focused': {
                    borderColor: 'var(--color-primary)',
                    borderWidth: '1px',
                  },
                  '&:hover': { borderColor: 'var(--color-primary)' },
                  '& input': { padding: '6px 10px', fontSize: '0.875rem' },
                  '& fieldset': { border: 'none' },
                },
              }}
            />
          </div>

          <div className="w-full h-8 rounded-lg flex gap-2 items-end">
            <Button
              onClick={onAplicar}
              disabled={
                isUpdating ||
                isSalvandoPermissoes ||
                isSalvandoFiscal ||
                produtosSelecionadosCount === 0 ||
                !adjustAmount.trim()
              }
              className="md:min-w-[180px] h-8 hover:bg-primary/90"
              sx={{ color: 'var(--color-info)', backgroundColor: 'var(--color-primary)' }}
            >
              {isUpdating
                ? 'Aplicando ajuste...'
                : `Aplicar ajuste (${produtosSelecionadosCount})`}
            </Button>
          </div>
        </div>
      </div>
      {produtosSelecionadosCount > 0 && (
        <p className="text-xs text-secondary-text mt-2">
          O ajuste será aplicado aos {produtosSelecionadosCount} produto(s) selecionado(s).
        </p>
      )}
    </>
  )
}
