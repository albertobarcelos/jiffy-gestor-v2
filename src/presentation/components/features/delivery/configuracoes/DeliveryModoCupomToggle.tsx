'use client'

import Tooltip from '@mui/material/Tooltip'
import { MdCallSplit, MdInfo, MdReceiptLong } from 'react-icons/md'
import type { ModoImpressaoDelivery } from '@/src/shared/types/deliveryImpressao'

export const DESCRICAO_MODO_CUPOM_DELIVERY: Record<ModoImpressaoDelivery, string> = {
  unificado: 'Um cupom completo ao iniciar preparo (recomendado para a maioria)',
  separado: 'Produção na cozinha ao receber e expedição ao marcar pronto',
}

export interface DeliveryModoCupomToggleProps {
  value: ModoImpressaoDelivery
  onChange: (next: ModoImpressaoDelivery) => void
  disabled?: boolean
  className?: string
}

export function DeliveryModoCupomInfoTooltip({ modo }: { modo: ModoImpressaoDelivery }) {
  return (
    <Tooltip title={DESCRICAO_MODO_CUPOM_DELIVERY[modo]} arrow placement="top">
      <span
        className="inline-flex cursor-help text-secondary-text transition-colors hover:text-primary-text"
        aria-label={`Informações sobre o modo ${modo === 'unificado' ? 'Unificado' : 'Separado'}`}
      >
        <MdInfo className="h-4 w-4" aria-hidden />
      </span>
    </Tooltip>
  )
}

/**
 * Alterna cupom delivery unificado (um ticket) vs separado (produção + expedição).
 * Visual alinhado ao segmento Delivery / Balcão do Kanban.
 */
export function DeliveryModoCupomToggle({
  value,
  onChange,
  disabled = false,
  className = '',
}: DeliveryModoCupomToggleProps) {
  return (
    <div
      role="group"
      aria-label="Modo de cupom delivery"
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 shadow-sm ${disabled ? 'pointer-events-none opacity-60' : ''} ${className}`}
    >
      <button
        type="button"
        aria-pressed={value === 'unificado'}
        disabled={disabled}
        onClick={() => onChange('unificado')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'unificado'
            ? 'bg-white text-secondary shadow-sm ring-1 ring-secondary/25'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MdReceiptLong className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Unificado
      </button>
      <button
        type="button"
        aria-pressed={value === 'separado'}
        disabled={disabled}
        onClick={() => onChange('separado')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'separado'
            ? 'bg-white text-secondary shadow-sm ring-1 ring-secondary/25'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MdCallSplit className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Separado
      </button>
    </div>
  )
}
