import { useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { ChevronDown } from 'lucide-react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'
import {
  useDashboardEvolucaoComparativoAnteriorQuery,
  useDashboardEvolucaoComparativoQuery,
} from '@/src/presentation/hooks/useDashboardEvolucaoComparativoQuery'
import { formatarMoeda } from './dashboardTextHelpers'

export type AgregacaoGraficoV2 = 'dia' | 'intervalo_60' | 'intervalo_30' | 'intervalo_15'
export type MetricaEvolucaoComparativo = 'FINALIZADA' | 'CANCELADA'

const LINHA_PERIODO_ATUAL = '#530CA3'
const LINHA_PERIODO_ANTERIOR = '#E1D8EE'
const LINHA_CANCEL_ATUAL = '#DC2626'
const LINHA_CANCEL_ANTERIOR = '#FCA5A5'

function formatarTickEixoYReais(v: number): string {
  const arred = Math.round(v)
  if (arred >= 1000) {
    const k = arred / 1000
    if (Math.abs(k - Math.round(k)) < 1e-6) return `R$ ${Math.round(k)}k`
    return `R$ ${k.toFixed(2).replace('.', ',')}k`
  }
  return `R$ ${arred.toLocaleString('pt-BR')}`
}

function calcularTicksEDominioYComparativo(
  pontos: Array<{ periodoAtual: number; periodoAnterior: number }>
): { domain: [number, number]; ticks: number[] } {
  let maxVal = 0
  for (const p of pontos) {
    maxVal = Math.max(maxVal, Number(p.periodoAtual), Number(p.periodoAnterior))
  }
  const topoBruto = maxVal > 0 ? maxVal * 1.08 : 100

  const PASSOS = [
    10, 15, 20, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 750, 1000, 1250, 1500, 2000,
    2500, 3000, 4000, 5000, 7500, 10000,
  ]
  const MAX_MARCAS = 14
  const MIN_MARCAS = 4

  for (const step of PASSOS) {
    const topo = Math.ceil(topoBruto / step) * step
    const nMarcas = Math.floor(topo / step) + 1
    if (topo + 1e-9 < topoBruto) continue
    if (nMarcas > MAX_MARCAS) continue
    if (nMarcas < MIN_MARCAS) continue
    const ticks: number[] = []
    for (let x = 0; x <= topo + 1e-9; x += step) {
      ticks.push(Math.round(x * 100) / 100)
    }
    return { domain: [0, topo], ticks }
  }

  const stepFallback = Math.max(100, Math.ceil(topoBruto / 8 / 100) * 100)
  const topoFb = Math.ceil(topoBruto / stepFallback) * stepFallback
  const ticksFb: number[] = []
  for (let x = 0; x <= topoFb + 1e-9; x += stepFallback) {
    ticksFb.push(x)
  }
  return { domain: [0, topoFb], ticks: ticksFb }
}

function rotuloLinhaGraficoPeriodoAtual(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Hoje'
    case 'ontem':
      return 'Ontem'
    case 'semana':
      return 'Últimos 7 dias'
    case '30dias':
      return 'Últimos 30 dias'
    case 'personalizado':
      return 'Período escolhido'
    default:
      return 'Período atual'
  }
}

function rotuloLinhaGraficoPeriodoAnterior(periodoData: string): string {
  switch (periodoData) {
    case 'hoje':
      return 'Ontem'
    case 'ontem':
      return 'Ante-ontem'
    case 'semana':
      return '7 dias anteriores'
    case '30dias':
      return '30 dias anteriores'
    case 'personalizado':
      return `30 dias antes (mesmo intervalo)`
    default:
      return 'Período anterior'
  }
}

function intervaloMinutosAgregacaoGraficoV2(g: AgregacaoGraficoV2): number | undefined {
  switch (g) {
    case 'intervalo_60':
      return 60
    case 'intervalo_30':
      return 30
    case 'intervalo_15':
      return 15
    default:
      return undefined
  }
}

export function DashboardGraficoComparativo({
  periodoData,
  timezoneAgregacao,
  periodoPersonalizadoInicio,
  periodoPersonalizadoFim,
  permiteGraficoPorHora,
  granularidade,
  setGranularidade,
}: {
  periodoData: string
  timezoneAgregacao: string
  periodoPersonalizadoInicio: Date | null
  periodoPersonalizadoFim: Date | null
  permiteGraficoPorHora: boolean
  granularidade: AgregacaoGraficoV2
  setGranularidade: (g: AgregacaoGraficoV2) => void
}) {
  const [metricaGraficoComparativo, setMetricaGraficoComparativo] =
    useState<MetricaEvolucaoComparativo>('FINALIZADA')

  const intervaloHoraEvolucao =
    permiteGraficoPorHora && granularidade !== 'dia'
      ? intervaloMinutosAgregacaoGraficoV2(granularidade)
      : undefined

  const {
    data: dadosEvolucaoBase,
    isLoading: carregandoGraficoComparativo,
    isError: erroGraficoComparativo,
  } = useDashboardEvolucaoComparativoQuery({
    periodo: periodoData,
    timezone: timezoneAgregacao,
    periodoInicial: periodoPersonalizadoInicio,
    periodoFinal: periodoPersonalizadoFim,
    intervaloHora: intervaloHoraEvolucao,
  })

  const { data: dadosEvolucaoComparativoCompleto } = useDashboardEvolucaoComparativoAnteriorQuery({
    periodo: periodoData,
    timezone: timezoneAgregacao,
    periodoInicial: periodoPersonalizadoInicio,
    periodoFinal: periodoPersonalizadoFim,
    intervaloHora: intervaloHoraEvolucao,
    dadosBaseProntos: !carregandoGraficoComparativo && dadosEvolucaoBase !== undefined,
  })

  const dadosEvolucaoComparativo = dadosEvolucaoComparativoCompleto ?? dadosEvolucaoBase

  const dadosGraficoFormatados = useMemo(() => {
    if (!dadosEvolucaoComparativo) return []
    return dadosEvolucaoComparativo.map(row => ({
      labelEixo: row.labelEixo,
      periodoAtual: metricaGraficoComparativo === 'FINALIZADA' ? row.finalizadasAtual : row.canceladasAtual,
      periodoAnterior: metricaGraficoComparativo === 'FINALIZADA' ? row.finalizadasAnterior : row.canceladasAnterior,
    }))
  }, [dadosEvolucaoComparativo, metricaGraficoComparativo])

  const { domain: domainYComparativo, ticks: ticksYComparativo } = useMemo(
    () => calcularTicksEDominioYComparativo(dadosGraficoFormatados),
    [dadosGraficoFormatados]
  )

  const corComparativoLinhaAtual =
    metricaGraficoComparativo === 'CANCELADA' ? LINHA_CANCEL_ATUAL : LINHA_PERIODO_ATUAL
  const corComparativoLinhaAnterior =
    metricaGraficoComparativo === 'CANCELADA' ? LINHA_CANCEL_ANTERIOR : LINHA_PERIODO_ANTERIOR

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="min-w-0 font-exo text-lg font-semibold text-primary-text md:text-xl">
          Comparativo de vendas
        </h2>
        <div className="relative min-w-[160px] shrink-0">
          <select
            value={permiteGraficoPorHora ? granularidade : 'dia'}
            onChange={e => setGranularidade(e.target.value as AgregacaoGraficoV2)}
            className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm font-semibold text-primary-text focus:border-secondary"
            aria-label="Agregação temporal do gráfico"
          >
            {permiteGraficoPorHora ? (
              <>
                <option value="intervalo_60">Por hora</option>
                <option value="intervalo_30">30 min</option>
                <option value="intervalo_15">15 min</option>
              </>
            ) : (
              <option value="dia">Por dia</option>
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-text" />
        </div>
      </div>
      <div className="mb-3">
        <div className="inline-flex rounded-lg bg-gray-100/90 p-0.5">
          <button
            type="button"
            onClick={() => setMetricaGraficoComparativo('FINALIZADA')}
            className={`rounded-md px-3 py-0.5 text-xs font-medium transition md:px-4 md:text-xs ${
              metricaGraficoComparativo === 'FINALIZADA'
                ? 'bg-secondary text-white shadow-sm'
                : 'bg-violet-100 text-violet-900 hover:bg-violet-200/90'
            }`}
          >
            Finalizadas
          </button>
          <button
            type="button"
            onClick={() => setMetricaGraficoComparativo('CANCELADA')}
            className={`rounded-md px-3 py-0.5 text-xs font-medium transition md:px-4 md:text-xs ${
              metricaGraficoComparativo === 'CANCELADA'
                ? 'bg-[#D92D20] text-white shadow-sm'
                : 'bg-red-100 text-[#D92D20] hover:bg-red-200/90'
            }`}
          >
            Canceladas
          </button>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-6 text-sm">
        <span
          className="inline-flex items-center gap-2 font-medium"
          style={{ color: corComparativoLinhaAtual }}
        >
          <span
            className="h-0.5 w-6 shrink-0 rounded"
            style={{ backgroundColor: corComparativoLinhaAtual }}
          />
          {rotuloLinhaGraficoPeriodoAtual(periodoData)}
        </span>
        <span
          className="inline-flex items-center gap-2 font-medium"
          style={{ color: corComparativoLinhaAnterior }}
        >
          <span
            className="h-0.5 w-6 shrink-0 rounded"
            style={{ backgroundColor: corComparativoLinhaAnterior }}
          />
          {rotuloLinhaGraficoPeriodoAnterior(periodoData)}
        </span>
      </div>
      <div className="h-[280px] w-full min-w-0 outline-none md:h-[320px] [&_*:focus-visible]:outline-none [&_*:focus]:outline-none [&_.recharts-layer:focus-visible]:outline-none [&_.recharts-layer:focus]:outline-none [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none [&_svg:focus]:outline-none">
        {carregandoGraficoComparativo ? (
          <div className="flex h-full min-h-[260px] items-center justify-center">
            <JiffyLoading className="!gap-0 !py-0" />
          </div>
        ) : erroGraficoComparativo ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center gap-2 px-4 text-center text-sm text-red-600">
            Não foi possível carregar o comparativo de vendas.
          </div>
        ) : dadosGraficoFormatados.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center text-sm text-gray-500">
            Nenhum dado para o período selecionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              tabIndex={-1}
              data={dadosGraficoFormatados}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="labelEixo"
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
              />
              <YAxis
                domain={domainYComparativo}
                ticks={ticksYComparativo}
                tickFormatter={formatarTickEixoYReais}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                axisLine={false}
                width={52}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const pAtual = payload.find(x => x.dataKey === 'periodoAtual')
                  const pAnt = payload.find(x => x.dataKey === 'periodoAnterior')
                  return (
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg">
                      <p className="mb-1 text-xs font-semibold text-secondary-text">{label}</p>
                      {pAtual != null && (
                        <p
                          className="text-sm font-semibold"
                          style={{ color: corComparativoLinhaAtual }}
                        >
                          {rotuloLinhaGraficoPeriodoAtual(periodoData)}:{' '}
                          {formatarMoeda(Number(pAtual.value))}
                        </p>
                      )}
                      {pAnt != null && (
                        <p
                          className="text-sm font-medium"
                          style={{ color: corComparativoLinhaAnterior }}
                        >
                          {rotuloLinhaGraficoPeriodoAnterior(periodoData)}:{' '}
                          {formatarMoeda(Number(pAnt.value))}
                        </p>
                      )}
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="periodoAnterior"
                stroke={corComparativoLinhaAnterior}
                strokeWidth={2}
                dot={false}
                name={rotuloLinhaGraficoPeriodoAnterior(periodoData)}
              />
              <Line
                type="monotone"
                dataKey="periodoAtual"
                stroke={corComparativoLinhaAtual}
                strokeWidth={2.5}
                dot={{ r: 4, fill: corComparativoLinhaAtual, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
                name={rotuloLinhaGraficoPeriodoAtual(periodoData)}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
