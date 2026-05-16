'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { RelatorioParticipacaoGrupoDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda } from '../utils/mvpFormatPt'

const PALETA_GRUPOS = ['#530CA3', '#006699', '#00B074', '#FF9800', '#DC2626', '#14B8A6', '#B4DD2B', '#003366']

export function MvpChartParticipacao(props: {
  dados: RelatorioParticipacaoGrupoDTO[] | undefined
  isLoading: boolean
}) {
  const { dados, isLoading } = props

  const chartData = useMemo(() => {
    if (!dados?.length) return []
    const filtrados = dados.filter(g => g.valorTotal > 0)
    const sorted = [...filtrados].sort((a, b) => b.valorTotal - a.valorTotal)
    return sorted.map((g, i) => ({
      name: g.nomeGrupo || 'Sem grupo',
      value: g.valorTotal,
      pct: g.pct,
      fill: PALETA_GRUPOS[i % PALETA_GRUPOS.length],
    }))
  }, [dados])

  if (isLoading) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
        Carregando participação por grupo…
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
        Sem dados suficientes para montar o gráfico de participação nos filtros atuais.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Participação no faturamento filtrado
      </h3>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Agrupamento por categoria/grupo cadastrado no cardápio.
      </p>
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="h-[240px] w-full max-w-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="54%"
                outerRadius="92%"
                paddingAngle={2}
              >
                {chartData.map((e, idx) => (
                  <Cell key={idx} fill={e.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatarMoeda(value)}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-1 flex-col gap-2 text-sm">
          {chartData.slice(0, 8).map(entry => (
            <li key={entry.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 truncate">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.fill }} />
                <span className="truncate dark:text-gray-200">{entry.name}</span>
              </span>
              <span className="shrink-0 tabular-nums text-gray-600 dark:text-gray-400">
                {entry.pct.toFixed(1).replace('.', ',')}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
