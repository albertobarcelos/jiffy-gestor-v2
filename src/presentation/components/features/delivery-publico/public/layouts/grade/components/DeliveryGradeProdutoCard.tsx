'use client'

import { Camera } from 'lucide-react'
import { formatDeliveryCurrency } from '../../../../shared/utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryGradeProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  onClick?: (produtoId: string) => void
}

export function DeliveryGradeProdutoCard({
  produto,
  interactive = false,
  onClick,
}: DeliveryGradeProdutoCardProps) {
  const content = (
    <>
      <div
        className="relative aspect-square w-full rounded-xl border"
        style={{
          backgroundColor: 'var(--delivery-surface-muted)',
          borderColor: 'var(--delivery-card-border)',
        }}
      >
        {produto.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagemUrl}
            alt=""
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-8 w-8" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
          </div>
        )}
      </div>
      <p
        className="mt-2 line-clamp-2 text-sm font-bold leading-snug"
        style={{
          color: 'var(--delivery-text)',
          fontFamily: 'var(--delivery-font-title)',
        }}
      >
        {produto.nome}
      </p>
      <p
        className="mt-0.5 text-sm font-semibold"
        style={{
          color: 'var(--delivery-primary)',
          fontFamily: 'var(--delivery-font-body)',
        }}
      >
        {formatDeliveryCurrency(produto.preco)}
      </p>
    </>
  )

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(produto.id)}
        className="w-full text-left transition-opacity hover:opacity-90"
      >
        {content}
      </button>
    )
  }

  return <div className="w-full">{content}</div>
}
