'use client'

import type { RelatorioProdutoVendidoLinhaDTO } from '@/src/shared/types/relatoriosProdutosVendidosApi'
import { formatarMoeda } from '@/src/presentation/components/features/dashboard/dashboardTextHelpers'

interface RelatoriosProdutosVendidosTableProps {
  items: RelatorioProdutoVendidoLinhaDTO[]
  mockAtivo: boolean
  offset: number
  isLoading: boolean
  isError: boolean
  errorMessage?: string
}

export function RelatoriosProdutosVendidosTable({
  items,
  mockAtivo,
  offset,
  isLoading,
  isError,
  errorMessage,
}: RelatoriosProdutosVendidosTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Carregando dados…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        {errorMessage ?? 'Não foi possível carregar o relatório.'}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        Nenhum produto encontrado para os filtros selecionados.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-600">
          <tr>
            <th className="px-3 py-3">#</th>
            <th className="px-3 py-3">ABC</th>
            <th className="px-3 py-3">Produto</th>
            <th className="px-3 py-3">Grupo</th>
            <th className="px-3 py-3 text-right">Qtd</th>
            <th className="px-3 py-3 text-right">Faturamento</th>
            <th className="px-3 py-3 text-right">Preço médio venda</th>
            <th className="px-3 py-3 text-right">Preço cardápio</th>
            <th className="px-3 py-3 text-right">Δ % vs cardápio</th>
            <th className="px-3 py-3 text-right">% fat.</th>
            <th className="px-3 py-3 text-right">% unid.</th>
            {mockAtivo ? <th className="px-3 py-3 text-right">Margem % (demo)</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 text-gray-800">
          {items.map((row, idx) => (
            <tr key={row.produtoId} className="hover:bg-gray-50/80">
              <td className="px-3 py-2 tabular-nums text-gray-500">{offset + idx + 1}</td>
              <td className="px-3 py-2">
                <BadgeAbc classe={row.classeAbc} />
              </td>
              <td className="max-w-[220px] px-3 py-2 font-medium">
                <span className="line-clamp-2" title={row.nome}>
                  {row.nome}
                </span>
              </td>
              <td className="max-w-[140px] px-3 py-2 text-gray-600">
                <span className="line-clamp-2" title={row.grupoNome ?? ''}>
                  {row.grupoNome ?? '—'}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatarNum(row.quantidade)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(row.valorTotal)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatarMoeda(row.precoMedioVenda)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                {row.valorCardapio != null ? formatarMoeda(row.valorCardapio) : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">
                {row.deltaPrecoVsCardapioPercentual != null
                  ? `${row.deltaPrecoVsCardapioPercentual.toFixed(1)}%`
                  : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{row.percentualFaturamento.toFixed(1)}%</td>
              <td className="px-3 py-2 text-right tabular-nums">{row.percentualUnidades.toFixed(1)}%</td>
              {mockAtivo ? (
                <td className="px-3 py-2 text-right tabular-nums text-amber-800">
                  {row.margemBrutaPercentual != null ? `${row.margemBrutaPercentual.toFixed(0)}%` : '—'}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatarNum(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function BadgeAbc({ classe }: { classe: string }) {
  const base = 'inline-flex min-w-[1.75rem] justify-center rounded px-1.5 py-0.5 text-xs font-bold'
  if (classe === 'A') {
    return <span className={`${base} bg-emerald-100 text-emerald-800`}>A</span>
  }
  if (classe === 'B') {
    return <span className={`${base} bg-amber-100 text-amber-900`}>B</span>
  }
  return <span className={`${base} bg-slate-100 text-slate-700`}>C</span>
}
