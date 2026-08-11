'use client'

import { Camera } from 'lucide-react'
import { DeliveryProdutoCardMediaOverlays } from '../../../../shared/components/DeliveryProdutoCardMediaOverlays'
import { formatDeliveryCurrency } from '../../../../shared/utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryCatalogoProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  quantidadeNoCarrinho?: number
  onClick?: (produtoId: string) => void
  onAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

export function DeliveryCatalogoProdutoCard({
  produto,
  interactive = false,
  quantidadeNoCarrinho = 0,
  onClick,
  onAddRapido,
  onAbrirCarrinho,
}: DeliveryCatalogoProdutoCardProps) {
  const handleOpen = () => onClick?.(produto.id)

  return (
    <div className="w-full snap-start">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl border"
        style={{
          backgroundColor: 'var(--delivery-surface)',
          borderColor: 'var(--delivery-card-border)',
        }}
      >
        {produto.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={produto.imagemUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-10 w-10" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
          </div>
        )}
        <DeliveryProdutoCardMediaOverlays
          produtoNome={produto.nome}
          interactive={interactive}
          temComplementos={produto.temComplementos}
          quantidadeNoCarrinho={quantidadeNoCarrinho}
          onOpen={onClick ? handleOpen : undefined}
          onAddRapido={onAddRapido ? () => onAddRapido(produto.id) : undefined}
          onAbrirCarrinho={onAbrirCarrinho}
        />
      </div>

      <button
        type="button"
        disabled={!interactive || !onClick}
        onClick={handleOpen}
        className="mt-2 w-full text-left disabled:cursor-default"
      >
        <p
          className="line-clamp-2 text-sm font-bold leading-snug"
          style={{
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-title)',
          }}
        >
          {produto.nome}
        </p>
        {produto.descricao ? (
          <p className="delivery-text-secondary mt-0.5 line-clamp-1 text-xs leading-snug">
            {produto.descricao}
          </p>
        ) : null}
        <p
          className="mt-0.5 text-sm font-semibold"
          style={{
            color: 'var(--delivery-primary)',
            fontFamily: 'var(--delivery-font-body)',
          }}
        >
          {formatDeliveryCurrency(produto.preco)}
        </p>
      </button>
    </div>
  )
}
