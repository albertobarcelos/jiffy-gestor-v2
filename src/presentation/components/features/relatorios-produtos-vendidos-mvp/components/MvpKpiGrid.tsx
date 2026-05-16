'use client'

import { ArrowDownRight, ArrowUpRight, Minus, Package } from 'lucide-react'
import type { RelatorioProdutosVendidosMvpKpisDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda, formatarVariacaoPct } from '../utils/mvpFormatPt'

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct == null || !Number.isFinite(pct)) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const up = pct > 0.05
  const down = pct < -0.05
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus
  const cls = up ? 'text-emerald-600' : down ? 'text-red-600' : 'text-gray-500'
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {formatarVariacaoPct(pct)}
    </span>
  )
}

function KpiSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-3 h-8 w-32 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  )
}

export function MvpKpiGrid(props: {
  kpis: RelatorioProdutosVendidosMvpKpisDTO | undefined
  isLoading: boolean
}) {
  const { kpis, isLoading } = props

  if (isLoading || !kpis) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Faturamento período',
      valor: formatarMoeda(kpis.faturamentoAtual),
      extra: <DeltaBadge pct={kpis.variacaoPercentualFat} />,
    },
    {
      label: 'Unidades vendidas',
      valor: kpis.quantidadeVendidaAtual.toLocaleString('pt-BR'),
      extra: <DeltaBadge pct={kpis.variacaoPercentualQuantidade} />,
    },
    {
      label: 'Ticket médio por unidade',
      valor: formatarMoeda(kpis.ticketMedioPorItemNoPeriodo),
      extra: <span className="text-xs text-gray-400">Base período inteiro PDV</span>,
    },
    {
      label: 'Líder em quantidade',
      valor: kpis.produtoLiderNomeQuantidade,
      extra: (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            <Package className="h-3 w-3" />
            {kpis.produtoLiderQuantidadeUnidades.toLocaleString('pt-BR')} un.
          </span>
          <DeltaBadge pct={kpis.produtoLiderPercentualVsPeriodoAnterior} />
        </div>
      ),
    },
  ]

  const growthNome = kpis.produtoComMaiorCrescimentoNome
  const growthPct = kpis.produtoComMaiorCrescimentoPct

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(c => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {c.label}
            </p>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-50">{c.valor}</p>
            <div className="mt-2">{c.extra}</div>
          </div>
        ))}
      </div>
      {growthNome != null && growthPct != null ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium text-gray-800 dark:text-gray-200">{growthNome}</span> registrou o maior
          crescimento de unidades versus o período anterior imediato (aprox.&nbsp;
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">{formatarVariacaoPct(growthPct)}</span>
          ).
        </p>
      ) : null}
    </div>
  )
}
