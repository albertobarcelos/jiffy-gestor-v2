'use client'

import { Camera } from 'lucide-react'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'
import { DeliveryPublicoMidiaImagem } from '../../../../shared/media/DeliveryPublicoMidiaImagem'
import { DELIVERY_IMAGEM_SIZES } from '../../../../shared/media/deliveryPublicoImageHosts'
import { DeliveryProdutoPreco } from '../../../../shared/components/DeliveryProdutoPreco'

type DeliveryCatalogoProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  priority?: boolean
  onClick?: (produtoId: string) => void
}

export function DeliveryCatalogoProdutoCard({
  produto,
  interactive = false,
  priority = false,
  onClick,
}: DeliveryCatalogoProdutoCardProps) {
  const content = (
    <>
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e5e7eb',
        }}
      >
        {produto.imagemUrl ? (
          <DeliveryPublicoMidiaImagem
            src={produto.imagemUrl}
            sizes={DELIVERY_IMAGEM_SIZES.catalogoCard}
            priority={priority}
            produtoId={produto.id}
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-10 w-10" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
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
      <DeliveryProdutoPreco produto={produto} className="mt-0.5" />
    </>
  )

  if (interactive && onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(produto.id)}
        className="w-full snap-start text-left transition-opacity hover:opacity-90"
      >
        {content}
      </button>
    )
  }

  return <div className="w-full snap-start">{content}</div>
}
