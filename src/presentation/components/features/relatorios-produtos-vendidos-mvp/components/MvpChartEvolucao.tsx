'use client'

import { useMemo, type CSSProperties, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RelatorioProdutosVendidosMvpSerieDiaDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import {
  MVP_CHART_TIPO_OPCOES_EVOLUCAO,
  MVP_PALETA_GRAFICOS,
  parseMvpChartTipoEvolucao,
  type MvpChartTipoEvolucao,
} from '../mvpChartTipos'
import { formatarMoeda, formatarRotuloSerieEvolucao, formatoTickYReais } from '../utils/mvpFormatPt'
import type { RelatorioSerieGranularidade } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { MvpChartTipoSelect } from './MvpChartTipoSelect'

const TOP_PRODUTOS_SERIE = 10

type SerieProdutoDef = {
  produtoId: string
  nomeLegenda: string
}

type LegendaEvolucaoItem = {
  id: string
  name: string
  value: number
  fill: string
}

type EvolucaoTooltipPayloadItem = {
  color?: string
  stroke?: string
  fill?: string
  name?: string
  value?: number | string
  dataKey?: string | number
}

const tooltipContainerStyle: CSSProperties = {
  borderRadius: 8,
  fontSize: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.42)',
  border: '1px solid rgba(0, 0, 0, 0.08)',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  backdropFilter: 'blur(2px)',
  padding: '8px 10px',
  maxHeight: 280,
  overflowY: 'auto',
}

function ordenarIdsSerieTemporal(serie: RelatorioProdutosVendidosMvpSerieDiaDTO[]): SerieProdutoDef[] {
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const dia of serie) {
    for (const v of dia.valores) {
      if (!seen.has(v.produtoId)) {
        seen.add(v.produtoId)
        ordered.push(v.produtoId)
      }
    }
  }

  const nomePorId = new Map<string, string>()
  for (const dia of serie) {
    for (const v of dia.valores) {
      if (v.nome && !nomePorId.has(v.produtoId)) nomePorId.set(v.produtoId, v.nome)
    }
  }

  return ordered.map(pid => ({
    produtoId: pid,
    nomeLegenda: nomePorId.get(pid)?.trim() || `Produto ${pid.slice(0, 6)}`,
  }))
}

function montarLegendaEvolucao(
  chartRows: Record<string, string | number>[],
  idsOrdenados: SerieProdutoDef[]
): LegendaEvolucaoItem[] {
  return idsOrdenados
    .map((def, idx) => {
      const key = `p_${def.produtoId}`
      const value = chartRows.reduce((sum, row) => {
        const v = row[key]
        return sum + (typeof v === 'number' ? v : 0)
      }, 0)
      return {
        id: def.produtoId,
        name: def.nomeLegenda,
        value,
        fill: MVP_PALETA_GRAFICOS[idx % MVP_PALETA_GRAFICOS.length],
      }
    })
    .filter(r => r.value > 0)
    .sort((a, b) => b.value - a.value)
}

function LegendaEvolucaoFixa({ items }: { items: LegendaEvolucaoItem[] }) {
  const total = items.reduce((s, e) => s + e.value, 0)

  return (
    <aside
      className="font-nunito shrink-0 border-t border-primary/10 pt-4 lg:w-56 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0 xl:w-60"
      aria-label="Legenda dos produtos"
    >
      <p className="font-exo mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Produtos
      </p>
      <ul className="scrollbar-thin flex max-h-[min(22rem,55vh)] flex-col gap-2 overflow-y-auto pr-1">
        {items.map(entry => {
          const pct = total > 0 ? (entry.value / total) * 100 : 0
          return (
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
                  {formatarMoeda(entry.value)} · {pct.toFixed(1).replace('.', ',')}%
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function GraficoEvolucaoComLegenda({
  legendaItems,
  children,
}: {
  legendaItems: LegendaEvolucaoItem[]
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      <div className="min-h-[280px] min-w-0 flex-1 sm:min-h-[320px]">{children}</div>
      <LegendaEvolucaoFixa items={legendaItems} />
    </div>
  )
}

function EvolucaoTooltipContent({
  active,
  payload,
  label,
  granularidade,
}: {
  active?: boolean
  payload?: EvolucaoTooltipPayloadItem[]
  label?: string
  granularidade: RelatorioSerieGranularidade
}) {
  if (!active || !payload?.length) return null

  const rotuloPeriodo = granularidade === 'hora' ? 'Hora' : 'Dia'

  return (
    <div className="font-nunito" style={tooltipContainerStyle}>
      <p className="mb-1.5 text-xs font-semibold text-primary-text">
        {rotuloPeriodo} {label}
      </p>
      <ul className="space-y-0.5">
        {payload.map((entry: EvolucaoTooltipPayloadItem) => {
          const cor = entry.color ?? entry.stroke ?? entry.fill ?? '#171A1C'
          const valor = typeof entry.value === 'number' ? formatarMoeda(entry.value) : '—'
          return (
            <li
              key={entry.dataKey ?? entry.name}
              className="flex items-center gap-1.5 text-xs leading-snug"
              style={{ color: cor }}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: cor }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{entry.name}</span>
              <span className="shrink-0 font-medium tabular-nums">{valor}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function calcularDomainY(
  chartRows: Record<string, string | number>[],
  idsOrdenados: SerieProdutoDef[]
): [number, number] {
  const maxValor = chartRows.reduce((m, row) => {
    let linhaMax = 0
    for (const def of idsOrdenados) {
      const key = `p_${def.produtoId}`
      const val = typeof row[key] === 'number' ? (row[key] as number) : 0
      linhaMax = Math.max(linhaMax, val)
    }
    return Math.max(m, linhaMax)
  }, 0)
  return [0, Math.max(maxValor * 1.08, 50)]
}

function GraficoEvolucaoPorTipo({
  tipo,
  chartRows,
  idsOrdenados,
  serieGranularidade,
}: {
  tipo: MvpChartTipoEvolucao
  chartRows: Record<string, string | number>[]
  idsOrdenados: SerieProdutoDef[]
  serieGranularidade: RelatorioSerieGranularidade
}) {
  const domainY = calcularDomainY(chartRows, idsOrdenados)
  const chartSurfaceClass = 'h-full w-full [&_.recharts-surface]:outline-none'
  const legendaItems = montarLegendaEvolucao(chartRows, idsOrdenados)

  const seriesCartesian = idsOrdenados.map((def, idx) => ({
    def,
    cor: MVP_PALETA_GRAFICOS[idx % MVP_PALETA_GRAFICOS.length],
    dataKey: `p_${def.produtoId}`,
  }))

  const marginBottom = serieGranularidade === 'hora' ? 8 : 0
  const xTickProps =
    serieGranularidade === 'hora'
      ? { fontSize: 9, interval: 1 as const }
      : { fontSize: 11 }

  const tooltip = <Tooltip content={<EvolucaoTooltipContent granularidade={serieGranularidade} />} />

  if (tipo === 'colunas') {
    return (
      <GraficoEvolucaoComLegenda legendaItems={legendaItems}>
        <div className={chartSurfaceClass}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartRows}
              margin={{ top: 10, left: -10, right: 10, bottom: marginBottom }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
              <XAxis dataKey="diaLabel" tick={xTickProps} />
              <YAxis domain={domainY} tickFormatter={formatoTickYReais} width={72} tick={{ fontSize: 11 }} />
              {tooltip}
              {seriesCartesian.map(({ def, cor, dataKey }) => (
                <Bar
                  key={def.produtoId}
                  dataKey={dataKey}
                  name={def.nomeLegenda}
                  stackId="fat"
                  fill={cor}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GraficoEvolucaoComLegenda>
    )
  }

  return (
    <GraficoEvolucaoComLegenda legendaItems={legendaItems}>
      <div className={chartSurfaceClass}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 10, left: -10, right: 10, bottom: marginBottom }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
            <XAxis dataKey="diaLabel" tick={xTickProps} />
            <YAxis domain={domainY} tickFormatter={formatoTickYReais} width={72} tick={{ fontSize: 11 }} />
            {tooltip}
            {seriesCartesian.map(({ def, cor, dataKey }) => (
              <Line
                key={def.produtoId}
                type="monotone"
                dataKey={dataKey}
                name={def.nomeLegenda}
                stroke={cor}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </GraficoEvolucaoComLegenda>
  )
}

export function MvpChartEvolucao(props: {
  serieTemporal: RelatorioProdutosVendidosMvpSerieDiaDTO[] | undefined
  serieSimplificada?: boolean
  serieGranularidade?: RelatorioSerieGranularidade
  tipoGrafico: MvpChartTipoEvolucao
  onTipoGraficoChange: (next: MvpChartTipoEvolucao) => void
}) {
  const {
    serieTemporal = [],
    serieSimplificada,
    serieGranularidade = 'dia',
    tipoGrafico,
    onTipoGraficoChange,
  } = props

  const idsOrdenados = useMemo(() => ordenarIdsSerieTemporal(serieTemporal), [serieTemporal])

  const chartRows = useMemo(() => {
    if (!serieTemporal.length || !idsOrdenados.length) return []
    return serieTemporal.map(diaRow => {
      const base: Record<string, string | number> = {
        diaLabel: formatarRotuloSerieEvolucao(diaRow.dia, serieGranularidade),
      }
      for (const { produtoId } of idsOrdenados) {
        const encontrado = diaRow.valores.find(v => v.produtoId === produtoId)
        base[`p_${produtoId}`] = encontrado?.valor ?? 0
      }
      return base
    })
  }, [serieTemporal, idsOrdenados, serieGranularidade])

  const temAlgumValor = useMemo(
    () => serieTemporal.some(p => p.totalDia > 0),
    [serieTemporal]
  )

  if (!chartRows.length || !temAlgumValor) {
    return (
      <div className="font-nunito rounded-lg border-2 border-dashed border-custom-2 bg-info p-6 text-center text-sm text-secondary-text">
        {serieGranularidade === 'hora'
          ? 'Sem vendas por hora nos produtos destacados neste dia.'
          : 'Sem pontos para o gráfico: não há valores diários nos produtos destacados neste período.'}
      </div>
    )
  }

  const subtituloCartesiano =
    serieGranularidade === 'hora'
      ? 'Faturamento por hora no dia (fuso da empresa · top produtos filtrados).'
      : 'Valores por dia (fuso da empresa · top produtos filtrados).'

  const tituloGrafico =
    serieGranularidade === 'hora'
      ? `Evolução por hora (top ${TOP_PRODUTOS_SERIE} por valor · filtrados)`
      : `Evolução diária (top ${TOP_PRODUTOS_SERIE} por valor · filtrados)`

  return (
    <div className="rounded-lg border-2 bg-info p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-exo text-sm font-semibold text-primary">{tituloGrafico}</h3>
          {serieSimplificada ? (
            <p className="font-nunito mt-1 text-xs text-warning">
              Pode não haver data de finalização nas vendas detalhadas — verifique períodos grandes ou
              buracos nos metadados.
            </p>
          ) : (
            <p className="font-nunito mt-1 text-xs text-secondary-text">{subtituloCartesiano}</p>
          )}
        </div>
        <MvpChartTipoSelect
          idPrefix="mvp-evolucao"
          value={tipoGrafico}
          onChange={next => onTipoGraficoChange(parseMvpChartTipoEvolucao(next))}
          opcoes={MVP_CHART_TIPO_OPCOES_EVOLUCAO}
        />
      </div>
      <div className="mt-4">
        <GraficoEvolucaoPorTipo
          tipo={tipoGrafico}
          chartRows={chartRows}
          idsOrdenados={idsOrdenados}
          serieGranularidade={serieGranularidade}
        />
      </div>
    </div>
  )
}
