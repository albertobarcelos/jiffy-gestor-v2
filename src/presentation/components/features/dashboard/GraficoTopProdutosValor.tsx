'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { DashboardTopProduto } from '@/src/domain/entities/DashboardTopProduto'

interface GraficoTopProdutosValorProps {
  data: DashboardTopProduto[]
}

/** Mesma paleta do gráfico de quantidade para consistência visual */
const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#d0ed57',
  '#a4de6c',
  '#83a6ed',
]

// Tick do eixo Y com quebra de linha para nomes longos
const CustomizedYAxisTick = (props: {
  x?: number
  y?: number
  payload?: { value?: string }
}) => {
  const { x = 0, y = 0, payload } = props
  const text = String(payload?.value ?? '')
  const CHAR_PER_LINE = 25

  const words = text.split(' ').filter(Boolean)
  if (words.length === 0) {
    return null
  }

  const lines: string[] = []
  let currentLine = words[0]

  for (let i = 1; i < words.length; i++) {
    if (currentLine.length + words[i].length + 1 <= CHAR_PER_LINE) {
      currentLine += ' ' + words[i]
    } else {
      lines.push(currentLine)
      currentLine = words[i]
    }
  }
  lines.push(currentLine)

  return (
    <text x={x} y={y} textAnchor="end" fill="#666" fontSize={10}>
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? 0 : 12}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export function GraficoTopProdutosValor({ data }: GraficoTopProdutosValorProps) {
  const chartData = data.map((item) => ({
    name: item.getProduto(),
    valorTotal: item.getValorTotal(),
  }))

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const chartHeight = 340

  return (
    <div className="w-full min-w-0">
      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            margin={{
              top: 5,
              right: 10,
              left: 50,
              bottom: 5,
            }}
            layout="vertical"
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={formatCurrency} domain={[0, 'auto']} />
            <YAxis type="category" dataKey="name" interval={0} tick={CustomizedYAxisTick} width={120} />
            <Tooltip
              cursor={false}
              formatter={(value) =>
                typeof value === 'number' ? formatCurrency(value) : ''
              }
            />
            <Bar dataKey="valorTotal" name="Valor" radius={[0, 4, 4, 0]}>
              {chartData.map((_, index) => (
                <Cell key={`bar-cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {chartData.length > 0 && (
        <div className="mt-3 w-full border border-gray-200 p-2">
          <h3
            id="grafico-top-produtos-valor-legenda-titulo"
            className="mb-2 font-exo text-sm font-semibold text-primary-text"
          >
            Legenda
          </h3>
          <div
            className="grid grid-cols-2 gap-x-3 gap-y-2 text-left"
            role="list"
            aria-labelledby="grafico-top-produtos-valor-legenda-titulo"
          >
            {chartData.map((entry, index) => (
              <div
                key={`${entry.name}-${index}`}
                className="flex min-w-0 items-start gap-2"
                role="listitem"
              >
                <span
                  className="mt-0.5 h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  aria-hidden
                />
                <span className="break-words font-nunito text-[11px] leading-snug text-primary-text sm:text-xs">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
