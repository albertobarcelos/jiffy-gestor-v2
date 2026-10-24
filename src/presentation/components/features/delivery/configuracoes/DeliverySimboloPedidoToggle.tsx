'use client'

import { MdQrCode2, MdViewWeek } from 'react-icons/md'
import type { DeliveryCupomSimboloPedido } from '@/src/shared/types/deliveryCupomTemplate'
import { CupomCampoInfo } from './DeliveryModoPapelToggle'

export const DESCRICAO_SIMBOLO_PEDIDO =
  'No cupom de produção (cozinha). A bancada lê esse código para marcar Pronto. A via do entregador não leva QR nem barras.'

export function DeliverySimboloPedidoInfoTooltip() {
  return <CupomCampoInfo texto={DESCRICAO_SIMBOLO_PEDIDO} ariaLabel="Código do pedido no papel" />
}

export function DeliverySimboloPedidoToggle(props: {
  value: DeliveryCupomSimboloPedido
  onChange: (next: DeliveryCupomSimboloPedido) => void
  disabled?: boolean
  className?: string
}) {
  const { value, onChange, disabled = false, className = '' } = props
  return (
    <div
      role="group"
      aria-label="Código do pedido no papel"
      className={`inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5 shadow-sm ${disabled ? 'pointer-events-none opacity-60' : ''} ${className}`}
    >
      <button
        type="button"
        aria-pressed={value === 'qrcode'}
        disabled={disabled}
        onClick={() => onChange('qrcode')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'qrcode'
            ? 'bg-white text-secondary shadow-sm ring-1 ring-secondary/25'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MdQrCode2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        QR Code
      </button>
      <button
        type="button"
        aria-pressed={value === 'codigo_barras'}
        disabled={disabled}
        onClick={() => onChange('codigo_barras')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
          value === 'codigo_barras'
            ? 'bg-white text-secondary shadow-sm ring-1 ring-secondary/25'
            : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        <MdViewWeek className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Código de barras
      </button>
    </div>
  )
}
