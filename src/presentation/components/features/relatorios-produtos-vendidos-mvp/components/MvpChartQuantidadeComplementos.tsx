'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RelatorioComplementoVendidoLinhaDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { MVP_PALETA_GRAFICOS } from '../mvpChartTipos'

const TOP_N = 15

type QtdChartRow = {
  id: string
  name: string
  labelCurto: string
  value: number
  fill: string
}

function truncarNome(nome: string, max = 14): string {
  const t = nome.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function montarChartData(
  items: RelatorioComplementoVendidoLinhaDTO[] | undefined
): QtdChartRow[] {
  if (!items?.length) return []
  return [...items]
    .filter(i => i.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, TOP_N)
    .map((i, idx) => ({
      id: i.complementoId,
      name: i.nome,
      labelCurto: truncarNome(i.nome),
      value: i.quantidade,
      fill: MVP_PALETA_GRAFICOS[idx % MVP_PALETA_GRAFICOS.length],
    }))
}

function LegendaComplementos({ chartData }: { chartData: QtdChartRow[] }) {
  return (
    <aside
      className="shrink-0 border-t border-primary/10 pt-4 lg:w-56 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 xl:w-60"
      aria-label="Legenda dos complementos"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Complementos
      </p>
      <ul className="scrollbar-thin flex max-h-[min(22rem,55vh)] flex-col gap-2 overflow-y-auto pr-1">
        {chartData.map(entry => (
          <li key={entry.id} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 h-3 w-3 shrink-0 rounded-sm shadow-sm ring-1 ring-black/5"
              style={{ backgroundColor: entry.fill }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-primary-text" title={entry.name}>
                {entry.name}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-secondary-text">
                {entry.value.toLocaleString('pt-BR')} un.
              </p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function MvpChartQuantidadeComplementos(props: {
  items: RelatorioComplementoVendidoLinhaDTO[] | undefined
}) {
  const { items } = props
  const chartData = useMemo(() => montarChartData(items), [items])

  if (!chartData.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-custom-2 bg-info p-6 text-center text-sm text-secondary-text">
        Sem dados suficientes para montar o gráfico de quantidade nos filtros atuais.
      </div>
    )
  }

  const maxValor = chartData.reduce((m, r) => Math.max(m, r.value), 0)
  const domainY: [number, number] = [0, Math.max(maxValor * 1.08, 1)]
  const totalFiltrado = items?.length ?? 0
  const exibeTop = totalFiltrado > TOP_N

  return (
    <div className="rounded-lg border-2 bg-info p-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-primary">Quantidade vendida</h3>
        <p className="mt-1 text-xs text-secondary-text">
          {exibeTop
            ? `Top ${TOP_N} complementos por unidades no período filtrado (${totalFiltrado} no total).`
            : 'Complementos por unidades vendidas no período filtrado.'}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="h-[min(22rem,50vh)] min-w-0 flex-1 [&_.recharts-surface]:outline-none">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="labelCurto" tick={false} axisLine={false} height={8} />
              <YAxis
                domain={domainY}
                allowDecimals={false}
                width={48}
                tick={{ fontSize: 11 }}
                tickFormatter={v => Number(v).toLocaleString('pt-BR')}
              />
              <Tooltip
                formatter={(value: number) => [
                  `${Number(value).toLocaleString('pt-BR')} un.`,
                  'Quantidade',
                ]}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload as QtdChartRow | undefined
                  return row?.name ?? String(_label)
                }}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map(e => (
                  <Cell key={e.id} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <LegendaComplementos chartData={chartData} />
      </div>
    </div>
  )
}
