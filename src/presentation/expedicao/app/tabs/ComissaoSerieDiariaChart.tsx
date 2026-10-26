'use client'

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PontoSerieDiariaComissao } from '@/src/application/expedicao/app/serieDiariaComissaoEntregador'
import { formatarMoedaApp } from '@/src/presentation/expedicao/app/format'

const COR_BARRA = '#DDD6FE'
const COR_DESTAQUE = '#5B21B6'

type PontoGrafico = PontoSerieDiariaComissao & { rotulo: string; rotuloTooltip: string }

function dataDoDia(dia: string): Date | null {
  const partes = dia.split('-')
  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]), 12, 0, 0, 0)
  return Number.isNaN(data.getTime()) ? null : data
}

function rotuloEixo(dia: string, quantidade: number): string {
  const data = dataDoDia(dia)
  if (!data) return dia
  if (quantidade > 10) return String(data.getDate())
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(data).replace('.', '')
}

function rotuloTooltip(dia: string): string {
  const data = dataDoDia(dia)
  if (!data) return dia
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(data)
    .replace('.', '')
}

type ComissaoSerieDiariaChartProps = {
  serie: PontoSerieDiariaComissao[]
}

function TooltipDia({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: PontoGrafico }>
}) {
  if (!active || !payload?.[0]) return null
  const ponto = payload[0].payload
  return (
    <div className="rounded-2xl bg-zinc-900 px-3 py-2 text-white shadow-lg">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">{ponto.rotuloTooltip}</p>
      <p className="mt-0.5 text-sm font-bold">{formatarMoedaApp(ponto.total)}</p>
      <p className="text-[11px] text-zinc-400">
        {ponto.quantidade} {ponto.quantidade === 1 ? 'entrega' : 'entregas'}
      </p>
    </div>
  )
}

export function ComissaoSerieDiariaChart(props: ComissaoSerieDiariaChartProps) {
  if (props.serie.length === 0) return null
  const temValor = props.serie.some(ponto => ponto.total > 0)
  const data = props.serie.map(ponto => ({
    ...ponto,
    rotulo: rotuloEixo(ponto.dia, props.serie.length),
    rotuloTooltip: rotuloTooltip(ponto.dia),
  }))
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Comparação diária</p>
          <p className="text-xs text-zinc-500">Taxa de entrega por dia</p>
        </div>
        {!temValor ? <p className="text-[11px] font-medium text-zinc-400">Sem entregas neste recorte</p> : null}
      </div>
      <div className="mt-3 h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={data.length > 10 ? '18%' : '28%'}>
            <XAxis
              dataKey="rotulo"
              axisLine={false}
              tickLine={false}
              interval={data.length > 14 ? 2 : 0}
              tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600 }}
            />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip cursor={{ fill: 'rgba(91,33,182,0.06)' }} content={<TooltipDia />} />
            <Bar dataKey="total" radius={[8, 8, 6, 6]} maxBarSize={28}>
              {data.map(ponto => (
                <Cell
                  key={ponto.dia}
                  fill={ponto.destaque ? COR_DESTAQUE : COR_BARRA}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
