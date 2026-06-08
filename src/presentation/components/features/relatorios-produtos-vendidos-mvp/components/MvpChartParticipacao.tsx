'use client'

import { useMemo, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RelatorioParticipacaoGrupoDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import {
  MVP_CHART_TIPO_OPCOES_GRUPOS,
  MVP_PALETA_GRAFICOS,
  parseMvpChartTipoGrupos,
  type MvpChartTipoGrupos,
} from '../mvpChartTipos'
import { formatarMoeda, formatoTickYReais } from '../utils/mvpFormatPt'
import { MvpChartTipoSelect } from './MvpChartTipoSelect'

const TOP_GRUPOS_PARTICIPACAO = 10

/** Linha de tendência no gráfico de linhas (grupos) — neutra; pontos mantêm cor do grupo. */
const COR_LINHA_GRAFICO_GRUPOS = '#9CA3AF'

const EIXO_GRUPO_TICK = { fontSize: 10, fill: '#4B5563' }

function eixoXComNomesGrupos() {
  return (
    <XAxis
      dataKey="name"
      tick={EIXO_GRUPO_TICK}
      angle={-35}
      textAnchor="end"
      height={56}
      interval={0}
    />
  )
}

function eixoYComNomesGrupos() {
  return (
    <YAxis
      type="category"
      dataKey="name"
      width={120}
      tick={EIXO_GRUPO_TICK}
      interval={0}
    />
  )
}

type GrupoChartRow = {
  id: string
  name: string
  value: number
  pct: number
  fill: string
}

function montarChartDataGrupos(dados: RelatorioParticipacaoGrupoDTO[] | undefined): GrupoChartRow[] {
  if (!dados?.length) return []
  const filtrados = dados.filter(g => g.valorTotal > 0)
  const sorted = [...filtrados]
    .sort((a, b) => b.valorTotal - a.valorTotal)
    .slice(0, TOP_GRUPOS_PARTICIPACAO)
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
      fill: MVP_PALETA_GRAFICOS[i % MVP_PALETA_GRAFICOS.length],
    }
  })
}

function LegendaGruposFixa({ chartData }: { chartData: GrupoChartRow[] }) {
  return (
    <aside
      className="font-nunito shrink-0 border-t border-primary/10 pt-4 lg:w-56 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 xl:w-60"
      aria-label="Legenda dos grupos"
    >
      <p className="font-exo mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Grupos
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
                {formatarMoeda(entry.value)} · {entry.pct.toFixed(1).replace('.', ',')}%
              </p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function GraficoGruposComLegenda({
  chartData,
  children,
}: {
  chartData: GrupoChartRow[]
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="min-h-[280px] min-w-0 flex-1 sm:min-h-[320px]">{children}</div>
      <LegendaGruposFixa chartData={chartData} />
    </div>
  )
}

function GraficoGruposPorTipo({
  tipo,
  chartData,
}: {
  tipo: MvpChartTipoGrupos
  chartData: GrupoChartRow[]
}) {
  const maxValor = chartData.reduce((m, r) => Math.max(m, r.value), 0)
  const domainY: [number, number] = [0, Math.max(maxValor * 1.08, 50)]
  const tooltipMoeda = (value: number) => formatarMoeda(value)

  if (tipo === 'donut' || tipo === 'pizza') {
    const innerRadius = tipo === 'donut' ? '52%' : 0
    return (
      <GraficoGruposComLegenda chartData={chartData}>
        <div className="mx-auto h-full w-full max-w-[min(100%,480px)] lg:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius="96%"
                paddingAngle={tipo === 'donut' ? 2 : 0}
              >
                {chartData.map(e => (
                  <Cell key={e.id} fill={e.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={tooltipMoeda} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </GraficoGruposComLegenda>
    )
  }

  const chartSurfaceClass = 'h-full w-full [&_.recharts-surface]:outline-none'

  if (tipo === 'barras') {
    return (
      <GraficoGruposComLegenda chartData={chartData}>
        <div className={chartSurfaceClass}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={chartData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" horizontal={false} />
              <XAxis type="number" tickFormatter={formatoTickYReais} tick={{ fontSize: 11 }} />
              {eixoYComNomesGrupos()}
              <Tooltip formatter={tooltipMoeda} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map(e => (
                  <Cell key={e.id} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GraficoGruposComLegenda>
    )
  }

  if (tipo === 'colunas') {
    return (
      <GraficoGruposComLegenda chartData={chartData}>
        <div className={chartSurfaceClass}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              {eixoXComNomesGrupos()}
              <YAxis domain={domainY} tickFormatter={formatoTickYReais} width={72} tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipMoeda} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map(e => (
                  <Cell key={e.id} fill={e.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GraficoGruposComLegenda>
    )
  }

  if (tipo === 'linhas') {
    return (
      <GraficoGruposComLegenda chartData={chartData}>
        <div className={chartSurfaceClass}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 48 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              {eixoXComNomesGrupos()}
              <YAxis domain={domainY} tickFormatter={formatoTickYReais} width={72} tick={{ fontSize: 11 }} />
              <Tooltip formatter={tooltipMoeda} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={COR_LINHA_GRAFICO_GRUPOS}
                strokeWidth={2}
                dot={({ cx, cy, index }) => {
                  const row = chartData[index ?? 0]
                  if (cx == null || cy == null || !row) return null
                  return <circle cx={cx} cy={cy} r={4} fill={row.fill} stroke="#fff" strokeWidth={1} />
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GraficoGruposComLegenda>
    )
  }

  return (
    <GraficoGruposComLegenda chartData={chartData}>
      <div className={chartSurfaceClass}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 48 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
            {eixoXComNomesGrupos()}
            <YAxis domain={domainY} tickFormatter={formatoTickYReais} width={72} tick={{ fontSize: 11 }} />
            <Tooltip formatter={tooltipMoeda} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map(e => (
                <Cell key={e.id} fill={e.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GraficoGruposComLegenda>
  )
}

export function MvpChartParticipacao(props: {
  dados: RelatorioParticipacaoGrupoDTO[] | undefined
  tipoGrafico: MvpChartTipoGrupos
  onTipoGraficoChange: (next: MvpChartTipoGrupos) => void
}) {
  const { dados, tipoGrafico, onTipoGraficoChange } = props
  const chartData = useMemo(() => montarChartDataGrupos(dados), [dados])

  if (!chartData.length) {
    return (
      <div className="font-nunito rounded-lg border-2 border-dashed border-custom-2 bg-info p-6 text-center text-sm text-secondary-text">
        Sem dados suficientes para montar o gráfico de participação nos filtros atuais.
      </div>
    )
  }

  return (
    <div className="rounded-lg border-2 bg-info p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-exo text-sm font-semibold text-primary">Participação no faturamento filtrado</h3>
          <p className="font-nunito mt-1 text-xs text-secondary-text">
            Top {TOP_GRUPOS_PARTICIPACAO} grupos por faturamento no período filtrado.
          </p>
        </div>
        <MvpChartTipoSelect
          idPrefix="mvp-grupos"
          value={tipoGrafico}
          onChange={next => onTipoGraficoChange(parseMvpChartTipoGrupos(next))}
          opcoes={MVP_CHART_TIPO_OPCOES_GRUPOS}
        />
      </div>
      <div className="mt-4">
        <GraficoGruposPorTipo tipo={tipoGrafico} chartData={chartData} />
      </div>
    </div>
  )
}
