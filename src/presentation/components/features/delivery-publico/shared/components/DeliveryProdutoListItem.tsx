'use client'

import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../types/deliveryPublicoViewModel'

type DeliveryProdutoListItemProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  onClick?: (produtoId: string) => void
}

export function DeliveryProdutoListItem({
  produto,
  interactive = false,
  onClick,
}: DeliveryProdutoListItemProps) {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold sm:text-base"
          style={{
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-title)',
          }}
        >
          {produto.nome}
        </p>
        <p
          className="text-xs sm:text-sm"
          style={{
            color: 'var(--delivery-primary)',
            fontFamily: 'var(--delivery-font-body)',
          }}
        >
          {formatDeliveryCurrency(produto.preco)}
        </p>
      </div>
      <div className="ml-3 h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 sm:h-14 sm:w-14">
        {produto.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.imagemUrl} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
    </>
  )

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(produto.id)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-100 p-3 text-left transition-colors hover:border-gray-200"
        style={{ backgroundColor: 'var(--delivery-surface)' }}
      >
        {content}
      </button>
    )
  }

  return (
    <div
      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
      style={{ backgroundColor: 'var(--delivery-surface)' }}
    >
      {content}
    </div>
  )
}
