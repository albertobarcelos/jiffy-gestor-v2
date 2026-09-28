'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type {
  RelatorioComplementoImpacto,
  RelatorioComplementoVendidoLinhaDTO,
} from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda } from '../utils/mvpFormatPt'

export type MvpImpactoMetricaDonut = 'quantidade' | 'valor'

const CORES_IMPACTO: Record<RelatorioComplementoImpacto, string> = {
  aumenta: '#00B074',
  diminui: '#DC2626',
  nenhum: '#9CA3AF',
}

const LABEL_IMPACTO: Record<RelatorioComplementoImpacto, string> = {
  aumenta: 'Aumenta',
  diminui: 'Diminui',
  nenhum: 'Nenhum',
}

const ORDEM_IMPACTO: RelatorioComplementoImpacto[] = ['aumenta', 'diminui', 'nenhum']

type ImpactoAgg = {
  impacto: RelatorioComplementoImpacto
  quantidade: number
  valor: number
}

type ImpactoChartRow = {
  impacto: RelatorioComplementoImpacto
  name: string
  value: number
  pctSlice: number
  fill: string
  quantidade: number
  valor: number
}

function agregarImpactos(items: RelatorioComplementoVendidoLinhaDTO[] | undefined): ImpactoAgg[] {
  const acc: Record<RelatorioComplementoImpacto, { quantidade: number; valor: number }> = {
    aumenta: { quantidade: 0, valor: 0 },
    diminui: { quantidade: 0, valor: 0 },
    nenhum: { quantidade: 0, valor: 0 },
  }

  for (const item of items ?? []) {
    acc.aumenta.quantidade += item.qtdAumenta ?? 0
    acc.diminui.quantidade += item.qtdDiminui ?? 0
    acc.nenhum.quantidade += item.qtdNenhum ?? 0
    acc.aumenta.valor += item.valorAumenta ?? 0
    acc.diminui.valor += item.valorDiminui ?? 0
  }

  return ORDEM_IMPACTO.map(impacto => ({
    impacto,
    quantidade: acc[impacto].quantidade,
    valor: acc[impacto].valor,
  }))
}

function montarChartData(
  agregados: ImpactoAgg[],
  metrica: MvpImpactoMetricaDonut
): ImpactoChartRow[] {
  const comValor = agregados
    .map(a => ({
      ...a,
      value: metrica === 'quantidade' ? a.quantidade : a.valor,
    }))
    .filter(a => a.value > 0)

  const total = comValor.reduce((s, a) => s + a.value, 0)
  if (total <= 0) return []

  return comValor.map(a => ({
    impacto: a.impacto,
    name: LABEL_IMPACTO[a.impacto],
    value: a.value,
    pctSlice: (a.value / total) * 100,
    fill: CORES_IMPACTO[a.impacto],
    quantidade: a.quantidade,
    valor: a.valor,
  }))
}

function LegendaImpacto({
  agregados,
  metrica,
}: {
  agregados: ImpactoAgg[]
  metrica: MvpImpactoMetricaDonut
}) {
  const totalQtd = agregados.reduce((s, a) => s + a.quantidade, 0)
  const totalValor = agregados.reduce((s, a) => s + a.valor, 0)

  return (
    <aside
      className="shrink-0 border-t border-primary/10 pt-4 lg:w-64 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
      aria-label="Legenda dos impactos"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Impactos
      </p>
      <ul className="flex flex-col gap-3">
        {agregados.map(entry => {
          const value = metrica === 'quantidade' ? entry.quantidade : entry.valor
          const total = metrica === 'quantidade' ? totalQtd : totalValor
          const pct = total > 0 ? (value / total) * 100 : 0
          return (
            <li key={entry.impacto} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: CORES_IMPACTO[entry.impacto] }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary-text">
                  {LABEL_IMPACTO[entry.impacto]}
                </p>
                {metrica === 'quantidade' ? (
                  <p className="mt-0.5 text-xs tabular-nums text-secondary-text">
                    {entry.quantidade.toLocaleString('pt-BR')} un. ·{' '}
                    {pct.toFixed(1).replace('.', ',')}%
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs tabular-nums text-secondary-text">
                    {formatarMoeda(entry.valor)} · {pct.toFixed(1).replace('.', ',')}%
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function ToggleMetricaImpacto(props: {
  metrica: MvpImpactoMetricaDonut
  onChange: (next: MvpImpactoMetricaDonut) => void
}) {
  const { metrica, onChange } = props
  const btnClass = (ativo: boolean) =>
    `rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      ativo ? 'bg-primary text-white' : 'bg-info text-primary-text hover:bg-primary/10'
    }`

  return (
    <div
      className="flex shrink-0 rounded-lg border border-primary/15 bg-white p-0.5"
      role="group"
      aria-label="Métrica do gráfico de impacto"
    >
      <button
        type="button"
        className={btnClass(metrica === 'quantidade')}
        onClick={() => onChange('quantidade')}
      >
        Quantidade
      </button>
      <button
        type="button"
        className={btnClass(metrica === 'valor')}
        onClick={() => onChange('valor')}
      >
        Valor
      </button>
    </div>
  )
}

export function MvpChartImpactoComplementos(props: {
  items: RelatorioComplementoVendidoLinhaDTO[] | undefined
}) {
  const { items } = props
  const [metrica, setMetrica] = useState<MvpImpactoMetricaDonut>('quantidade')
  const agregados = useMemo(() => agregarImpactos(items), [items])
  const chartData = useMemo(() => montarChartData(agregados, metrica), [agregados, metrica])

  if (!chartData.length) {
    return (
      <div className="rounded-lg border-2 border-dashed border-custom-2 bg-info p-6 text-center text-sm text-secondary-text">
        Sem dados suficientes para montar o gráfico de impactos nos filtros atuais.
      </div>
    )
  }

  const tooltipFormatter = (value: number, _name: string, item: { payload?: ImpactoChartRow }) => {
    const row = item.payload
    if (!row) return [String(value), '']
    if (metrica === 'valor') {
      return [`${formatarMoeda(value)} (${row.pctSlice.toFixed(1).replace('.', ',')}%)`, row.name]
    }
    return [
      `${value.toLocaleString('pt-BR')} un. (${row.pctSlice.toFixed(1).replace('.', ',')}%)`,
      row.name,
    ]
  }

  return (
    <div className="rounded-lg border-2 bg-info p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-primary">Distribuição por impacto</h3>
          <p className="mt-1 text-xs text-secondary-text">
            Participação dos complementos que aumentam, diminuem ou não alteram o preço no período
            filtrado.
          </p>
        </div>
        <ToggleMetricaImpacto metrica={metrica} onChange={setMetrica} />
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className="mx-auto min-h-[280px] w-full min-w-0 flex-1 sm:min-h-[320px] lg:mx-0">
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
                  <Cell key={e.impacto} fill={e.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <LegendaImpacto agregados={agregados} metrica={metrica} />
      </div>
    </div>
  )
}
