'use client'

import { useState } from 'react'

export type PeriodoType = 'hoje' | 'semana' | 'mes' | 'trimestre' | 'ano' | 'personalizado'

interface PeriodoFilterProps {
  periodoInicial?: PeriodoType
  onPeriodoChanged?: (periodo: PeriodoType) => void
}

const periodoLabels: Record<PeriodoType, string> = {
  hoje: 'Hoje',
  semana: 'Semana',
  mes: 'Mês',
  trimestre: 'Trimestre',
  ano: 'Ano',
  personalizado: 'Personalizado',
}

/**
 * Componente de filtro de período
 * Replica o design do Flutter
 */
export function PeriodoFilter({ periodoInicial = 'hoje', onPeriodoChanged }: PeriodoFilterProps) {
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoType>(periodoInicial)

  const handlePeriodoChange = (periodo: PeriodoType) => {
    setPeriodoSelecionado(periodo)
    onPeriodoChanged?.(periodo)
  }

  return (
    <div className="h-10 inline-flex items-center bg-custom-2 rounded-full overflow-hidden">
      {(Object.keys(periodoLabels) as PeriodoType[]).map((periodo) => {
        const isSelected = periodoSelecionado === periodo
        return (
          <button
            key={periodo}
            onClick={() => handlePeriodoChange(periodo)}
            className={`
              px-5 h-full font-exo text-sm font-medium transition-all
              ${isSelected ? 'bg-primary text-accent1 font-semibold' : 'text-secondary-text'}
            `}
          >
            {periodoLabels[periodo]}
          </button>
        )
      })}
    </div>
  )
}

