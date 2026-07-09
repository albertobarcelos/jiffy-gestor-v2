'use client'

import { Camera } from 'lucide-react'
import { formatDeliveryCurrency } from '../../../../shared/utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryVitrineProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  onClick?: (produtoId: string) => void
}

export function DeliveryVitrineProdutoCard({
  produto,
  interactive = false,
  onClick,
}: DeliveryVitrineProdutoCardProps) {
  const cardStyle = {
    backgroundColor: 'var(--delivery-surface)',
    borderColor: 'var(--delivery-card-border)',
  } as const

  const content = (
    <>
      <div
        className="relative aspect-[4/3] w-full"
        style={{ backgroundColor: 'var(--delivery-surface-muted)' }}
      >
        {produto.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.imagemUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-12 w-12" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <p
          className="min-w-0 truncate text-base font-bold @sm:text-lg"
          style={{
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-title)',
          }}
        >
          {produto.nome}
        </p>
        <p
          className="shrink-0 text-base font-bold @sm:text-lg"
          style={{
            color: 'var(--delivery-primary)',
            fontFamily: 'var(--delivery-font-body)',
          }}
        >
          {formatDeliveryCurrency(produto.preco)}
        </p>
      </div>
    </>
  )

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(produto.id)}
        className="w-full overflow-hidden rounded-2xl border text-left shadow-sm transition-shadow hover:shadow-md"
        style={cardStyle}
      >
        {content}
      </button>
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border shadow-sm" style={cardStyle}>
      {content}
    </div>
  )
}
