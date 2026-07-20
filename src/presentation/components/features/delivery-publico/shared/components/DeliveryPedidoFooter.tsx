'use client'

import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'

type DeliveryPedidoFooterProps = {
  total: number
  quantidadeItens: number
  interactive?: boolean
  onClick?: () => void
}

export function DeliveryPedidoFooter({
  total,
  quantidadeItens,
  interactive = false,
  onClick,
}: DeliveryPedidoFooterProps) {
  const itensLabel = quantidadeItens === 1 ? '1 item' : `${quantidadeItens} itens`

  const content = (
    <>
      <div className="flex min-w-0 flex-col items-start gap-0.5 text-left font-normal">
        <span className="text-sm leading-tight text-neutral-900">Subtotal</span>
        <span className="text-sm leading-tight text-neutral-900">
          {formatDeliveryCurrency(total)}
          <span className="text-neutral-400"> / {itensLabel}</span>
        </span>
      </div>
      <span className="shrink-0 rounded-full bg-black px-5 py-2.5 text-sm font-normal text-white">
        Ver carrinho
      </span>
    </>
  )

  const barClassName =
    'flex w-full items-center justify-between gap-3 border-t border-neutral-200 bg-white px-5 py-3 text-neutral-900'

  if (interactive && onClick) {
    return (
      <button type="button" onClick={onClick} aria-label="Ver carrinho" className={barClassName}>
        {content}
      </button>
    )
  }

  return <div className={barClassName}>{content}</div>
}
