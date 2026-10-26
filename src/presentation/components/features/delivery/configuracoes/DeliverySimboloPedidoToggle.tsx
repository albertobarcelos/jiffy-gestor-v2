'use client'

import { MdBlock, MdQrCode2, MdViewWeek } from 'react-icons/md'
import type { DeliveryCupomSimboloPedido } from '@/src/shared/types/deliveryCupomTemplate'
import { CupomCampoInfo } from './DeliveryModoPapelToggle'

export const DESCRICAO_SIMBOLO_PEDIDO =
  'No cupom de produção (cozinha). No modo por unidade, só a via de conferência leva o símbolo — cada papel unitário fica sem. Padrão: nenhum. A via do entregador nunca leva símbolo.'

const OPCOES: Array<{
  valor: DeliveryCupomSimboloPedido
  label: string
  Icon: typeof MdBlock
}> = [
  { valor: 'nenhum', label: 'Nenhum', Icon: MdBlock },
  { valor: 'qrcode', label: 'QR Code', Icon: MdQrCode2 },
  { valor: 'codigo_barras', label: 'Código de barras', Icon: MdViewWeek },
]

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
      {OPCOES.map(({ valor, label, Icon }) => {
        const ativo = value === valor
        return (
          <button
            key={valor}
            type="button"
            aria-pressed={ativo}
            disabled={disabled}
            onClick={() => onChange(valor)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              ativo
                ? 'bg-white text-secondary shadow-sm ring-1 ring-secondary/25'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
