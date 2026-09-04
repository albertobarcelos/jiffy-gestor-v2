'use client'

import Tooltip from '@mui/material/Tooltip'
import { MdInfo, MdImage, MdTextFields } from 'react-icons/md'
import type { DeliveryCupomModoPapel } from '@/src/shared/types/deliveryCupomTemplate'

export const DESCRICAO_MODO_PAPEL =
  'Texto: a impressora escreve o cupom com as próprias letras — sai mais rápido. Gráfico: o papel sai igual ao preview ao lado.'

export function CupomCampoInfo({ texto, ariaLabel }: { texto: string; ariaLabel: string }) {
  return (
    <Tooltip title={texto} arrow placement="top">
      <span
        className="inline-flex cursor-help text-secondary-text transition-colors hover:text-primary-text"
        aria-label={ariaLabel}
      >
        <MdInfo className="h-4 w-4" aria-hidden />
      </span>
    </Tooltip>
  )
}

export function DeliveryModoPapelInfoTooltip() {
  return <CupomCampoInfo texto={DESCRICAO_MODO_PAPEL} ariaLabel="Como imprimir no papel" />
}

export function DeliveryModoPapelToggle(props: {
  value: DeliveryCupomModoPapel
  onChange: (next: DeliveryCupomModoPapel) => void
  disabled?: boolean
  className?: string
}) {
  const { value, onChange, disabled = false, className = '' } = props
  return (
    <div
      role="group"
      aria-label="Modo de impressão no papel"
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 shadow-sm ${disabled ? 'pointer-events-none opacity-60' : ''} ${className}`}
    >
      <button
        type="button"
        aria-pressed={value === 'texto'}
        disabled={disabled}
        onClick={() => onChange('texto')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'texto'
            ? 'bg-white text-secondary shadow-sm ring-1 ring-secondary/25'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MdTextFields className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Texto
      </button>
      <button
        type="button"
        aria-pressed={value === 'grafico'}
        disabled={disabled}
        onClick={() => onChange('grafico')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'grafico'
            ? 'bg-white text-secondary shadow-sm ring-1 ring-secondary/25'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MdImage className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Gráfico
      </button>
    </div>
  )
}
