'use client'

import { useMemo } from 'react'
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

const CORES_LINHA = ['#530CA3', '#006699', '#00B074', '#FF9800', '#DC2626']

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
    nomeLegenda: nomePorId.get(pid)?.trim() || `SKU ${pid.slice(0, 6)}`,
  }))
}

export function MvpChartEvolucao(props: {
  serieTemporal: RelatorioProdutosVendidosMvpSerieDiaDTO[] | undefined
  serieSimplificada?: boolean
  isLoading: boolean
  desabilitadoUsuario?: boolean
}) {
  const { serieTemporal = [], serieSimplificada, isLoading, desabilitadoUsuario } = props

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

  if (desabilitadoUsuario) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
        Série temporal desativada. Ative “Carregar série temporal” nos filtros para ver a evolução diária.
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800">
        Carregando evolução diária…
      </div>
    )
  }

  if (!chartRows.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900">
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        Evolução diária (top por valor · filtrados)
      </h3>
      {serieSimplificada ? (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
          Pode não haver data de finalização nas vendas detalhadas — verifique períodos grandes ou buracos nos
          metadados.
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
            <Tooltip
              formatter={(v: number) => formatarMoeda(v)}
              labelFormatter={(l: string) => `Dia ${l}`}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
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
