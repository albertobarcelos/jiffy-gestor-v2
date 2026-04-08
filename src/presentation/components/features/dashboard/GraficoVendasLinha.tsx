'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { calculatePeriodo, permiteOpcoesIntervaloPorHora } from '@/src/shared/utils/dateFilters'
import { useDashboardEvolucaoQuery } from '@/src/presentation/hooks/useDashboardEvolucaoQuery'

/**
 * Evolução de vendas — Area Chart (Recharts).
 * Eixo X (modo diário): até 10 dias no filtro → um tick por dia (com preenchimento de dias sem venda);
 * mais de 10 dias → um tick a cada 3 dias.
 */

interface GraficoVendasLinhaProps {
  periodo: string
  selectedStatuses: string[]
  periodoInicial?: Date | null
  periodoFinal?: Date | null
  intervaloHora?: number // Intervalo em minutos (15, 30 ou 60)
  /**
   * Se `false`, agrega por dia (não envia `intervaloHora`), inclusive em "Hoje"/"Ontem".
   * Se omitido, mantém o comportamento legado: hora quando o período permitir.
   */
  agregarPorHora?: boolean
}

type Row = {
  label: string
  periodoKey: string
  Finalizadas?: number
  Canceladas?: number
}

const TICK_STYLE = { fontSize: 11, fill: '#6B7280' }
const GRID_STROKE = '#E5E7EB'

function formatCurrency(value: number) {
  return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Formato do label de dia igual ao da API (evolucao). */
function labelDiaPtBr(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

/** Chave YYYY-MM-DD em data local. */
function chaveDiaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Quantidade de dias de calendário inclusivos entre duas datas (só dia/mês/ano). */
function diasCalendarioInclusivos(a: Date, b: Date): number {
  const start = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const end = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  if (end.getTime() < start.getTime()) return 0
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
}

/**
 * Ticks do eixo X em modo diário: ≤10 dias no período → todos os dias; >10 → um a cada 3 dias (índice 0,3,6…).
 */
function ticksEixoXModoDiario(rows: Row[], inicio: Date | null, fim: Date | null): string[] | undefined {
  const diarios = rows.filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.periodoKey))
  if (diarios.length === 0) return undefined

  const ordenados = [...diarios].sort((a, b) => a.periodoKey.localeCompare(b.periodoKey))

  let diasSpan: number
  if (inicio && fim) {
    diasSpan = diasCalendarioInclusivos(inicio, fim)
  } else {
    const primeiro = new Date(ordenados[0].periodoKey + 'T12:00:00')
    const ultimo = new Date(ordenados[ordenados.length - 1].periodoKey + 'T12:00:00')
    const s = new Date(primeiro.getFullYear(), primeiro.getMonth(), primeiro.getDate())
    const e = new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate())
    diasSpan = diasCalendarioInclusivos(s, e)
  }

  if (diasSpan <= 10) {
    return ordenados.map((r) => r.label)
  }
  return ordenados.filter((_, i) => i % 3 === 0).map((r) => r.label)
}

export function GraficoVendasLinha({
  periodo,
  selectedStatuses: selectedStatusesProp,
  periodoInicial,
  periodoFinal,
  intervaloHora = 30,
  agregarPorHora,
}: GraficoVendasLinhaProps) {
  const selectedStatuses = selectedStatusesProp ?? []

  const { inicio, fim } = useMemo(() => {
    if (periodoInicial && periodoFinal) {
      return { inicio: periodoInicial, fim: periodoFinal }
    }
    if (periodo === 'Todos') {
      return { inicio: null, fim: null }
    }
    const { inicio: calcInicio, fim: calcFim } = calculatePeriodo(periodo)
    return { inicio: calcInicio, fim: calcFim }
  }, [periodo, periodoInicial, periodoFinal])

  // Só envia intervalo 15/30/60 min para a API em "Hoje" ou em "Por datas" com até 2 dias inclusivos
  const useIntervaloHoraAuto =
    periodo === 'Hoje' ||
    !!(periodoInicial && periodoFinal && permiteOpcoesIntervaloPorHora(periodoInicial, periodoFinal))

  const useIntervaloHora = agregarPorHora === false ? false : useIntervaloHoraAuto

  const { data, isLoading, error, refetch } = useDashboardEvolucaoQuery({
    periodoInicial: inicio,
    periodoFinal: fim,
    selectedStatuses,
    intervaloHora: useIntervaloHora ? intervaloHora : undefined,
  })

  const categories = useMemo(() => {
    const c: string[] = []
    if (selectedStatuses.includes('FINALIZADA')) c.push('Finalizadas')
    if (selectedStatuses.includes('CANCELADA')) c.push('Canceladas')
    return c
  }, [selectedStatuses])

  const chartData = useMemo((): Row[] => {
    if (!data?.length) return []
    const baseRows: Row[] = data.map((item) => {
      const row: Row = { label: item.label, periodoKey: item.data }
      if (selectedStatuses.includes('FINALIZADA')) row.Finalizadas = item.valorFinalizadas
      if (selectedStatuses.includes('CANCELADA')) row.Canceladas = item.valorCanceladas
      return row
    })

    // Modo diário com intervalo explícito: preenche dias sem venda com 0 para o gráfico e o eixo X
    if (useIntervaloHora || !inicio || !fim) {
      return baseRows
    }

    const temChaveDia = baseRows.some((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.periodoKey))
    if (!temChaveDia) {
      return baseRows
    }

    const start = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate())
    const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate())
    if (end.getTime() < start.getTime()) {
      return baseRows
    }

    const porDia = new Map<string, Row>()
    for (const r of baseRows) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.periodoKey)) {
        porDia.set(r.periodoKey, r)
      }
    }

    const filled: Row[] = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const key = chaveDiaLocal(cursor)
      const existente = porDia.get(key)
      if (existente) {
        filled.push(existente)
      } else {
        const row: Row = { label: labelDiaPtBr(new Date(cursor)), periodoKey: key }
        if (selectedStatuses.includes('FINALIZADA')) row.Finalizadas = 0
        if (selectedStatuses.includes('CANCELADA')) row.Canceladas = 0
        filled.push(row)
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    return filled.length > 0 ? filled : baseRows
  }, [data, selectedStatuses, useIntervaloHora, inicio, fim])

  const ticksX = useMemo(() => {
    if (useIntervaloHora) return undefined
    return ticksEixoXModoDiario(chartData, inicio, fim)
  }, [chartData, useIntervaloHora, inicio, fim])

  const { minDomain, maxDomain } = useMemo(() => {
    if (!chartData.length || categories.length === 0) {
      return { minDomain: 0, maxDomain: 0 }
    }
    let currentMax = 0
    let currentMin = 0
    if (selectedStatuses.includes('FINALIZADA')) {
      currentMax = Math.max(currentMax, ...chartData.map((d) => Number(d.Finalizadas ?? 0)))
      currentMin = Math.min(currentMin, ...chartData.map((d) => Number(d.Finalizadas ?? 0)))
    }
    if (selectedStatuses.includes('CANCELADA')) {
      currentMax = Math.max(currentMax, ...chartData.map((d) => Number(d.Canceladas ?? 0)))
      currentMin = Math.min(currentMin, ...chartData.map((d) => Number(d.Canceladas ?? 0)))
    }
    const finalMin = currentMin < 0 ? currentMin * 1.1 : 0
    const finalMax = currentMax * 1.1
    return { minDomain: finalMin, maxDomain: finalMax }
  }, [chartData, categories.length, selectedStatuses])

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-red-600">
            {error instanceof Error ? error.message : 'Erro ao carregar dados'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <p className="text-gray-500">Nenhum dado disponível</p>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="flex h-full min-h-[300px] items-center justify-center">
        <p className="text-center text-gray-500">
          Marque &quot;Finalizadas&quot; e/ou &quot;Canceladas&quot; acima para ver o gráfico.
        </p>
      </div>
    )
  }

  return (
    <div className="grafico-vendas-linha h-full min-h-[300px] w-full min-w-0 text-[11px] [&_.recharts-legend-item-text]:text-[11px]">
      <ResponsiveContainer width="100%" height="100%" minHeight={300}>
        <AreaChart data={chartData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id="fillFinalizadas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillCanceladas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis
            dataKey="label"
            ticks={ticksX}
            tick={TICK_STYLE}
            tickLine={false}
            axisLine={{ stroke: GRID_STROKE }}
            height={40}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={formatCurrency}
            tick={TICK_STYLE}
            tickLine={false}
            axisLine={false}
            width={100}
            domain={[minDomain, maxDomain]}
          />
          <Tooltip
            cursor={{ stroke: '#d1d5db', strokeWidth: 1 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              const labelStr = label != null ? String(label) : ''
              const hasHour = /^\d{2}\/\d{2} \d{2}:\d{2}$/.test(labelStr)
              const titulo = hasHour ? `Hora: ${labelStr}` : `Dia: ${labelStr}`
              // Fundo claro fixo (sem variantes dark) para leitura consistente no gráfico
              return (
                <div
                  className="rounded-lg border border-[var(--color-primary)] bg-white text-[11px] text-gray-900 shadow-md"
                  style={{ backgroundColor: '#ffffff', color: '#111827' }}
                >
                  <div className="border-b border-gray-200 px-3 py-2 font-medium text-gray-900">
                    {titulo}
                  </div>
                  <div className="space-y-1 px-3 py-2">
                    {payload
                      .filter((p) => p.type !== 'none')
                      .map((entry, i) => (
                        <div key={i} className="flex items-center justify-between gap-6">
                          <span className="text-gray-600">{entry.name}</span>
                          <span className="font-medium tabular-nums text-gray-900">
                            {typeof entry.value === 'number' ? formatCurrency(entry.value) : ''}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: '#4B5563' }} />
          {selectedStatuses.includes('FINALIZADA') && (
            <Area
              type="monotone"
              dataKey="Finalizadas"
              name="Finalizadas"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#fillFinalizadas)"
              connectNulls
            />
          )}
          {selectedStatuses.includes('CANCELADA') && (
            <Area
              type="monotone"
              dataKey="Canceladas"
              name="Canceladas"
              stroke="#EF4444"
              strokeWidth={2}
              fill="url(#fillCanceladas)"
              connectNulls
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
