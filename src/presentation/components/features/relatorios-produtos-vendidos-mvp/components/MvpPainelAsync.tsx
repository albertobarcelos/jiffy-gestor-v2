'use client'

import type { ReactNode } from 'react'
import { JiffyLoading } from '@/src/presentation/components/ui/JiffyLoading'

/** Envelope SPA: painel montado na árvore, dados carregados sob demanda. */
export function MvpPainelAsync(props: {
  titulo?: string
  loading: boolean
  error: Error | null
  children: ReactNode
  /** KPIs e blocos baixos — sem altura mínima grande. */
  compact?: boolean
  minHeightClass?: string
}) {
  const { titulo, loading, error, children, compact = false, minHeightClass } = props

  const shellMin =
    minHeightClass ?? (compact ? '' : 'min-h-[min(22rem,40vh)]')
  const loadingMin = compact ? 'min-h-[5rem]' : 'min-h-[12rem]'

  return (
    <div
      className={`m-1 rounded-lg border border-primary/10 bg-info p-3 ${shellMin}`.trim()}
    >
      {titulo ? (
        <p className="font-nunito mb-2 text-xs font-medium text-secondary-text">{titulo}</p>
      ) : null}
      {loading ? (
        <div className={`flex items-center justify-center py-4 ${loadingMin}`}>
          <JiffyLoading />
        </div>
      ) : error ? (
        <p className="font-nunito py-2 text-center text-sm text-red-600">
          {error.message || 'Erro ao carregar este painel.'}
        </p>
      ) : (
        children
      )}
    </div>
  )
}
