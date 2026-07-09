'use client'

import { ChevronDown } from 'lucide-react'

type DeliveryGradeDeliverySelectorProps = {
  tipoEntrega: 'entrega' | 'retirada'
  interactive?: boolean
  onChange?: (tipo: 'entrega' | 'retirada') => void
}

export function DeliveryGradeDeliverySelector({
  tipoEntrega,
  interactive = false,
  onChange,
}: DeliveryGradeDeliverySelectorProps) {
  const label = tipoEntrega === 'entrega' ? 'Delivery' : 'Para retirar'

  return (
    <div className="px-4">
      <button
        type="button"
        disabled={!interactive}
        onClick={() => interactive && onChange?.(tipoEntrega === 'entrega' ? 'retirada' : 'entrega')}
        className="flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-semibold shadow-sm disabled:cursor-default"
        style={{
          borderColor: 'var(--delivery-card-border)',
          color: 'var(--delivery-text)',
          fontFamily: 'var(--delivery-font-body)',
        }}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden>🛵</span>
          {label}
        </span>
        <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
      </button>
    </div>
  )
}
