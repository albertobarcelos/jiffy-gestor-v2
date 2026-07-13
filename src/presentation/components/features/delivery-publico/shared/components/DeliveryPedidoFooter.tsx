'use client'

import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'

type DeliveryPedidoFooterProps = {
  total: number
  interactive?: boolean
  onClick?: () => void
}

export function DeliveryPedidoFooter({ total, interactive = false, onClick }: DeliveryPedidoFooterProps) {
  const content = (
    <>
      <span>O meu pedido</span>
      <span>{formatDeliveryCurrency(total)}</span>
    </>
  )

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="mx-4 mb-4 flex w-[calc(100%-2rem)] items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold @sm:text-base"
        style={{ backgroundColor: 'var(--delivery-primary-dark)', color: 'var(--delivery-btn-text, #ffffff)' }}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className="mx-4 mb-4 flex items-center justify-between rounded-xl px-4 py-3.5 text-sm font-semibold @sm:text-base"
      style={{ backgroundColor: 'var(--delivery-primary-dark)', color: 'var(--delivery-btn-text, #ffffff)' }}
    >
      {content}
    </div>
  )
}
