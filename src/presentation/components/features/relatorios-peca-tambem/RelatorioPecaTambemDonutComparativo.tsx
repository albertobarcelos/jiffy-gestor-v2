'use client'

import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

type RelatorioPecaTambemDonutComparativoProps = {
  valorPrincipal: number
  valorTotal: number
  labelPrincipal: string
  labelDemais: string
  labelCentro?: string
  subtitulo: string
  corPrincipal: string
  corDemais: string
  formatarValor: (valor: number) => string
  embutidoNoModal?: boolean
}

function formatarPercentual(p: number): string {
  const x = Math.min(100, Math.max(0, p))
  if (Math.abs(x - Math.round(x)) < 0.05) return `${Math.round(x)}%`
  return `${x.toFixed(1).replace('.', ',')}%`
}

/**
 * Donut comparativo (parte vs total do período) — faturamento ou produtos vendidos.
 */
export function RelatorioPecaTambemDonutComparativo({
  valorPrincipal,
  valorTotal,
  labelPrincipal,
  labelDemais,
  labelCentro,
  subtitulo,
  corPrincipal,
  corDemais,
  formatarValor,
  embutidoNoModal = false,
}: RelatorioPecaTambemDonutComparativoProps) {
  const principal = Math.max(0, valorPrincipal)
  const total = Math.max(0, valorTotal)
  const demais = Math.max(0, total - principal)
  const pct = total > 0 ? (principal / total) * 100 : 0
  const centro = labelCentro ?? labelPrincipal

  const data = useMemo(() => {
    if (total <= 0 && principal <= 0) {
      return [{ name: 'Sem dados', value: 1, fill: corDemais }]
    }
    if (demais <= 0 && principal > 0) {
      return [{ name: labelPrincipal, value: principal, fill: corPrincipal }]
    }
    if (principal <= 0 && demais > 0) {
      return [{ name: labelDemais, value: demais, fill: corDemais }]
    }
    return [
      { name: labelPrincipal, value: principal, fill: corPrincipal },
      { name: labelDemais, value: demais, fill: corDemais },
    ]
  }, [principal, demais, total, labelPrincipal, labelDemais, corPrincipal, corDemais])

  return (
    <div
      className={
        embutidoNoModal
          ? 'flex w-full flex-col items-center justify-center'
          : 'flex min-w-[220px] flex-1 flex-col items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3 sm:max-w-xs'
      }
    >
      {!embutidoNoModal && (
        <p className="mb-1 text-sm font-semibold text-primary-text">Participação</p>
      )}
      <p
        className={`mb-3 text-center leading-snug text-primary/70 ${
          embutidoNoModal ? 'text-sm' : 'text-[11px]'
        }`}
      >
        {subtitulo}
      </p>
      <div
        className={`relative outline-none [&_*:focus]:outline-none [&_.recharts-sector:focus]:stroke-none [&_.recharts-surface:focus]:outline-none [&_.recharts-wrapper:focus]:outline-none [&_svg:focus]:outline-none ${
          embutidoNoModal ? 'h-[260px] w-[260px]' : 'h-[160px] w-[160px]'
        }`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart tabIndex={-1}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="58%"
              outerRadius="100%"
              paddingAngle={total > 0 && principal > 0 && demais > 0 ? 2 : 0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                formatarValor(Number(value) || 0),
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <span
            className={`font-semibold text-primary-text ${
              embutidoNoModal ? 'text-2xl' : 'text-base'
            }`}
          >
            {formatarPercentual(pct)}
          </span>
          <span className={`text-primary/70 ${embutidoNoModal ? 'text-xs' : 'text-[10px]'}`}>
            {centro}
          </span>
        </div>
      </div>
      <div className={`mt-4 w-full space-y-1.5 ${embutidoNoModal ? 'text-sm' : 'text-xs'}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-primary-text">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: corPrincipal }}
            />
            {labelPrincipal}
          </span>
          <span className="font-semibold text-primary-text">{formatarValor(principal)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-primary-text">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: corDemais }}
            />
            {labelDemais}
          </span>
          <span className="font-semibold text-primary-text">{formatarValor(demais)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-1.5 text-primary/80">
          <span>Total do período</span>
          <span className="font-semibold text-primary-text">{formatarValor(total)}</span>
        </div>
      </div>
    </div>
  )
}
