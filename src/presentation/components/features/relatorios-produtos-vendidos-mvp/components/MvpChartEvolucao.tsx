'use client'

import { useMemo, type CSSProperties } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RelatorioProdutosVendidosMvpSerieDiaDTO } from '@/src/shared/types/relatoriosProdutosVendidosMvpApi'
import { formatarMoeda, formatarDiaDm, formatoTickYReais } from '../utils/mvpFormatPt'

const TOP_PRODUTOS_SERIE = 10

const CORES_LINHA = [
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

function ordenarIdsSerieTemporal(serie: RelatorioProdutosVendidosMvpSerieDiaDTO[]): {
  produtoId: string
  nomeLegenda: string
}[] {
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

type EvolucaoTooltipPayloadItem = {
  color?: string
  stroke?: string
  name?: string
  value?: number | string
  dataKey?: string | number
}

function EvolucaoTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: EvolucaoTooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="font-nunito" style={tooltipContainerStyle}>
      <p className="mb-1.5 text-xs font-semibold text-primary-text">Dia {label}</p>
      <ul className="space-y-0.5">
        {payload.map((entry: EvolucaoTooltipPayloadItem) => {
          const cor = entry.color ?? entry.stroke ?? '#171A1C'
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

export function MvpChartEvolucao(props: {
  serieTemporal: RelatorioProdutosVendidosMvpSerieDiaDTO[] | undefined
  serieSimplificada?: boolean
}) {
  const { serieTemporal = [], serieSimplificada } = props

  const idsOrdenados = useMemo(() => ordenarIdsSerieTemporal(serieTemporal), [serieTemporal])

  const chartRows = useMemo(() => {
    if (!serieTemporal.length || !idsOrdenados.length) return []
    return serieTemporal.map(diaRow => {
      const base: Record<string, string | number> = {
        diaLabel: formatarDiaDm(diaRow.dia),
      }
      for (let i = 0; i < idsOrdenados.length; i++) {
        const { produtoId } = idsOrdenados[i]
        const encontrado = diaRow.valores.find(v => v.produtoId === produtoId)
        base[`p_${produtoId}`] = encontrado?.valor ?? 0
      }
      return base
    })
  }, [serieTemporal, idsOrdenados])

  if (!chartRows.length) {
    return (
      <div className="font-nunito rounded-lg border-2 border-dashed border-custom-2 bg-info p-6 text-center text-sm text-secondary-text">
        Sem pontos para o gráfico: não há valores diários nos produtos destacados neste período.
      </div>
    )
  }

  const maxValor = chartRows.reduce((m, row) => {
    let linhaMax = 0
    for (const def of idsOrdenados) {
      const key = `p_${def.produtoId}`
      const val = typeof row[key] === 'number' ? (row[key] as number) : 0
      linhaMax = Math.max(linhaMax, val)
    }
    return Math.max(m, linhaMax)
  }, 0)

  const domainY: [number, number] = [0, Math.max(maxValor * 1.08, 50)]

  return (
    <div className="rounded-lg border-2 bg-info p-4">
      <h3 className="font-exo text-sm font-semibold text-primary">
        Evolução diária (top {TOP_PRODUTOS_SERIE} por valor · filtrados)
      </h3>
      {serieSimplificada ? (
        <p className="font-nunito mt-1 text-xs text-warning">
          Pode não haver data de finalização nas vendas detalhadas — verifique períodos grandes ou buracos nos
          metadados.
        </p>
      ) : (
        <p className="font-nunito mt-1 text-xs text-secondary-text">
          Valores de linha são soma das linhas de produtos por dia (fuso da empresa).
        </p>
      )}
      <div className="mt-4 h-[300px] w-full [&_.recharts-surface]:outline-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartRows} margin={{ top: 10, left: -10, right: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
            <XAxis dataKey="diaLabel" tick={{ fontSize: 11 }} />
            <YAxis
              domain={domainY}
              tickFormatter={formatoTickYReais}
              width={72}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<EvolucaoTooltipContent />} />
            {idsOrdenados.map((def, idx) => (
              <Line
                key={def.produtoId}
                type="monotone"
                dataKey={`p_${def.produtoId}`}
                name={def.nomeLegenda}
                stroke={CORES_LINHA[idx % CORES_LINHA.length]}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
