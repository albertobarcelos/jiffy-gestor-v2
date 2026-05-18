'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { RelatorioParticipacaoGrupoDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda } from '../utils/mvpFormatPt'

/** Máximo de grupos exibidos no donut e na legenda (menor se houver menos no período). */
const TOP_GRUPOS_PARTICIPACAO = 10

const PALETA_GRUPOS = [
  '#530CA3',
  '#006699',
  '#00B074',
  '#FF9800',
  '#DC2626',
  '#14B8A6',
  '#B4DD2B',
  '#003366',
  '#8338EC',
  '#E85D04',
]

export function MvpChartParticipacao(props: {
  dados: RelatorioParticipacaoGrupoDTO[] | undefined
  isLoading: boolean
}) {
  const { dados, isLoading } = props

  const chartData = useMemo(() => {
    if (!dados?.length) return []
    const filtrados = dados.filter(g => g.valorTotal > 0)
    const sorted = [...filtrados].sort((a, b) => b.valorTotal - a.valorTotal).slice(0, TOP_GRUPOS_PARTICIPACAO)
    const contagemPorNome = new Map<string, number>()
    for (const g of sorted) {
      const nome = g.nomeGrupo || 'Sem grupo'
      contagemPorNome.set(nome, (contagemPorNome.get(nome) ?? 0) + 1)
    }
    return sorted.map((g, i) => {
      const nomeBase = g.nomeGrupo || 'Sem grupo'
      const nomeDuplicado = (contagemPorNome.get(nomeBase) ?? 0) > 1
      const name =
        nomeDuplicado && g.grupoId
          ? `${nomeBase} (${g.grupoId.slice(0, 6)})`
          : nomeDuplicado
            ? `${nomeBase} (${g.key.slice(0, 6)})`
            : nomeBase
      return {
        id: g.key,
        name,
        value: g.valorTotal,
        pct: g.pct,
        fill: PALETA_GRUPOS[i % PALETA_GRUPOS.length],
      }
    })
  }, [dados])

  if (isLoading) {
    return (
      <div className="font-nunito flex h-[280px] items-center justify-center rounded-lg border-2 bg-info text-sm text-secondary-text">
        Carregando participação por grupo…
      </div>
    )
  }

  if (!chartData.length) {
    return (
      <div className="font-nunito rounded-lg border-2 border-dashed border-custom-2 bg-info p-6 text-center text-sm text-secondary-text">
        Sem dados suficientes para montar o gráfico de participação nos filtros atuais.
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 bg-info p-4">
      <h3 className="font-exo text-sm font-semibold text-primary">Participação no faturamento filtrado</h3>
      <p className="font-nunito mt-1 text-xs text-secondary-text">
        Top {TOP_GRUPOS_PARTICIPACAO} grupos por faturamento no período filtrado.
      </p>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center justify-between lg:gap-5">
        <div className="mx-auto h-[300px] w-full min-w-[260px] max-w-[400px] shrink-0 sm:h-[320px] lg:mx-0 lg:h-[340px] lg:max-w-[min(48%,420px)] lg:flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="52%"
                outerRadius="96%"
                paddingAngle={2}
              >
                {chartData.map(e => (
                  <Cell key={e.id} fill={e.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatarMoeda(value)}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="font-nunito flex mr-5 w-full flex-col gap-1.5 text-sm lg:max-w-[30%] lg:flex-1 lg:justify-center">
          {chartData.map(entry => (
            <li key={entry.id} className="flex max-w-full items-center justify-between gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: entry.fill }}
                aria-hidden
              />
              <div className="flex flex-row gap-4 justify-between w-full">
              <span className="min-w-0 truncate text-left text-primary-text">{entry.name}</span>
              <span className="shrink-0 tabular-nums text-secondary-text">
                {entry.pct.toFixed(1).replace('.', ',')}%
              </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
