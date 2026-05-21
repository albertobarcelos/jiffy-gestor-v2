'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { RelatorioParticipacaoAbcDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda } from '../utils/mvpFormatPt'
import {
  MVP_CORES_CLASSE_ABC,
  MVP_LABEL_CLASSE_ABC,
  type MvpAbcMetricaDonut,
} from '../mvpChartAbc'

type AbcChartRow = {
  classe: RelatorioParticipacaoAbcDTO['classe']
  name: string
  value: number
  pctSlice: number
  fill: string
  qtdProdutos: number
  pctProdutos: number
  valorTotal: number
  pctFaturamento: number
}

function montarChartDataAbc(
  dados: RelatorioParticipacaoAbcDTO[] | undefined,
  metrica: MvpAbcMetricaDonut
): AbcChartRow[] {
  if (!dados?.length) return []
  return dados
    .filter(d => (metrica === 'faturamento' ? d.valorTotal > 0 : d.qtdProdutos > 0))
    .map(d => ({
      classe: d.classe,
      name: MVP_LABEL_CLASSE_ABC[d.classe],
      value: metrica === 'faturamento' ? d.valorTotal : d.qtdProdutos,
      pctSlice: metrica === 'faturamento' ? d.pctFaturamento : d.pctProdutos,
      fill: MVP_CORES_CLASSE_ABC[d.classe],
      qtdProdutos: d.qtdProdutos,
      pctProdutos: d.pctProdutos,
      valorTotal: d.valorTotal,
      pctFaturamento: d.pctFaturamento,
    }))
}

function LegendaAbc({ dados }: { dados: RelatorioParticipacaoAbcDTO[] }) {
  return (
    <aside
      className="font-nunito shrink-0 border-t border-primary/10 pt-4 lg:w-64 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0"
      aria-label="Legenda das classes ABC"
    >
      <p className="font-exo mb-2 text-xs font-semibold uppercase tracking-wide text-secondary-text">
        Classes ABC
      </p>
      <ul className="flex flex-col gap-3">
        {dados.map(entry => (
          <li key={entry.classe} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold text-white shadow-sm"
              style={{ backgroundColor: MVP_CORES_CLASSE_ABC[entry.classe] }}
              aria-hidden
            >
              {entry.classe}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary-text">
                {MVP_LABEL_CLASSE_ABC[entry.classe]}
              </p>
              <p className="mt-0.5 text-xs tabular-nums text-secondary-text">
                {formatarMoeda(entry.valorTotal)} · {entry.pctFaturamento.toFixed(1).replace('.', ',')}%
                faturamento
              </p>
              <p className="text-xs tabular-nums text-secondary-text">
                {entry.qtdProdutos} produto{entry.qtdProdutos === 1 ? '' : 's'} ·{' '}
                {entry.pctProdutos.toFixed(1).replace('.', ',')}% dos produtos
              </p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

function ToggleMetricaAbc(props: {
  metrica: MvpAbcMetricaDonut
  onChange: (next: MvpAbcMetricaDonut) => void
}) {
  const { metrica, onChange } = props
  const btnClass = (ativo: boolean) =>
    `font-nunito rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
      ativo ? 'bg-primary text-white' : 'bg-info text-primary-text hover:bg-primary/10'
    }`

  return (
    <div
      className="flex shrink-0 rounded-lg border border-primary/15 bg-white p-0.5"
      role="group"
      aria-label="Métrica do gráfico ABC"
    >
      <button type="button" className={btnClass(metrica === 'faturamento')} onClick={() => onChange('faturamento')}>
        Faturamento
      </button>
      <button type="button" className={btnClass(metrica === 'skus')} onClick={() => onChange('skus')}>
        Produtos
      </button>
    </div>
  )
}

export function MvpChartAbc(props: { dados: RelatorioParticipacaoAbcDTO[] | undefined }) {
  const { dados } = props
  const [metrica, setMetrica] = useState<MvpAbcMetricaDonut>('faturamento')
  const chartData = useMemo(() => montarChartDataAbc(dados, metrica), [dados, metrica])

  if (!chartData.length) {
    return (
      <div className="font-nunito rounded-lg border-2 border-dashed border-custom-2 bg-info p-6 text-center text-sm text-secondary-text">
        Sem dados suficientes para montar o gráfico ABC nos filtros atuais.
      </div>
    )
  }

  const tooltipFormatter = (value: number, _name: string, item: { payload?: AbcChartRow }) => {
    const row = item.payload
    if (!row) return [String(value), '']
    if (metrica === 'faturamento') {
      return [`${formatarMoeda(value)} (${row.pctSlice.toFixed(1).replace('.', ',')}%)`, row.name]
    }
    return [
      `${value} produto${value === 1 ? '' : 's'} (${row.pctSlice.toFixed(1).replace('.', ',')}%)`,
      row.name,
    ]
  }

  return (
    <div className="rounded-lg border-2 bg-info p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-exo text-sm font-semibold text-primary">Distribuição ABC</h3>
          <p className="font-nunito mt-1 text-xs text-secondary-text">
            Curva de Pareto no faturamento filtrado: A até ~80%, B até ~95%, C o restante.
          </p>
        </div>
        <ToggleMetricaAbc metrica={metrica} onChange={setMetrica} />
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
                  <Cell key={e.classe} fill={e.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={tooltipFormatter} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <LegendaAbc dados={dados ?? []} />
      </div>
    </div>
  )
}
