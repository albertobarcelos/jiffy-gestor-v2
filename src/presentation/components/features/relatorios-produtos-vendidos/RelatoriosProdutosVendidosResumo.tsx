'use client'

import type { RelatorioProdutosVendidosResponseDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import { formatarMoeda } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'

interface RelatoriosProdutosVendidosResumoProps {
  data: RelatorioProdutosVendidosResponseDTO | undefined
  isLoading: boolean
}

export function RelatoriosProdutosVendidosResumo({ data, isLoading }: RelatoriosProdutosVendidosResumoProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    )
  }

  const t = data?.totaisPeriodo ?? { quantidadeTotal: 0, valorTotal: 0, skusDistintos: 0 }
  const totalFiltrado = data?.totalFiltrado ?? 0

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500">Faturamento no período</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{formatarMoeda(t.valorTotal)}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500">Unidades vendidas</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{formatarInteiro(t.quantidadeTotal)}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500">SKUs distintos (período)</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{formatarInteiro(t.skusDistintos)}</p>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-gray-500">Linhas após filtros</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">{formatarInteiro(totalFiltrado)}</p>
      </div>
    </div>
  )
}

function formatarInteiro(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return Math.round(n).toLocaleString('pt-BR')
}
