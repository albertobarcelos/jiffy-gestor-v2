'use client'

import { RelatoriosProdutosVendidosFilters } from '@/src/presentation/components/features/relatorios-produtos-vendidos/RelatoriosProdutosVendidosFilters'
import type { RelatoriosProdutosVendidosFiltersValues } from '@/src/presentation/components/features/relatorios-produtos-vendidos/RelatoriosProdutosVendidosFilters'

interface MvpFiltersBarProps {
  values: RelatoriosProdutosVendidosFiltersValues
  onChange: (next: RelatoriosProdutosVendidosFiltersValues) => void
  onAplicar: () => void
  gruposLoading: boolean
  grupos: { id: string; nome: string }[]
  incluirSerie: boolean
  onIncluirSerieChange: (v: boolean) => void
}

export function MvpFiltersBar({
  values,
  onChange,
  onAplicar,
  gruposLoading,
  grupos,
  incluirSerie,
  onIncluirSerieChange,
}: MvpFiltersBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          Canal de venda: em breve
        </span>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            className="rounded border-gray-300"
            checked={incluirSerie}
            onChange={e => onIncluirSerieChange(e.target.checked)}
          />
          Carregar série temporal (top produtos por valor)
        </label>
      </div>
      <RelatoriosProdutosVendidosFilters
        values={values}
        onChange={onChange}
        onAplicar={onAplicar}
        gruposLoading={gruposLoading}
        grupos={grupos}
      />
    </div>
  )
}
