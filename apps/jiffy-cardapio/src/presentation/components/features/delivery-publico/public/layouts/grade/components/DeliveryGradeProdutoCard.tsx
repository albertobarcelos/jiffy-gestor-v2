'use client'

import { Camera } from 'lucide-react'
import { formatDeliveryCurrency } from '../../../../shared/utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'
import { DeliveryPublicoMidiaImagem } from '../../../../shared/media/DeliveryPublicoMidiaImagem'
import { DELIVERY_IMAGEM_SIZES } from '../../../../shared/media/deliveryPublicoImageHosts'

type DeliveryGradeProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  priority?: boolean
  onClick?: (produtoId: string) => void
}

export function DeliveryGradeProdutoCard({
  produto,
  interactive = false,
  priority = false,
  onClick,
}: DeliveryGradeProdutoCardProps) {
  const content = (
    <>
      <div
        className="relative aspect-square w-full rounded-xl border"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb',
        }}
      >
        {produto.imagemUrl ? (
          <DeliveryPublicoMidiaImagem
            src={produto.imagemUrl}
            sizes={DELIVERY_IMAGEM_SIZES.gradeCard}
            priority={priority}
            produtoId={produto.id}
            className="rounded-xl object-cover"
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
