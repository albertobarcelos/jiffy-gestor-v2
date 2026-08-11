'use client'

import { Camera } from 'lucide-react'
import { DeliveryProdutoCardMediaOverlays } from '../../../../shared/components/DeliveryProdutoCardMediaOverlays'
import { formatDeliveryCurrency } from '../../../../shared/utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryVitrineProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  quantidadeNoCarrinho?: number
  onClick?: (produtoId: string) => void
  onAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

export function DeliveryVitrineProdutoCard({
  produto,
  interactive = false,
  quantidadeNoCarrinho = 0,
  onClick,
  onAddRapido,
  onAbrirCarrinho,
}: DeliveryVitrineProdutoCardProps) {
  const cardStyle = {
    backgroundColor: 'var(--delivery-surface)',
    borderColor: 'var(--delivery-card-border)',
  } as const

  const handleOpen = () => onClick?.(produto.id)

  const media = (
    <div
      className="relative aspect-[4/3] w-full border-b"
      style={{
        backgroundColor: 'var(--delivery-surface)',
        borderColor: 'var(--delivery-card-border)',
      }}
    >
      {produto.imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={produto.imagemUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain object-center"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera className="h-12 w-12" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
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
        addSize="md"
      />
    </div>
  )

  const body = (
    <div className="flex flex-col gap-1 px-3 py-2.5 @3xl:px-3 @3xl:py-2 @5xl:px-2.5 @5xl:py-2">
      <div className="flex items-start justify-between gap-2 @3xl:flex-col @3xl:items-stretch @3xl:gap-0.5 @5xl:gap-0.5">
        <p
          className="min-w-0 truncate text-base font-bold @sm:text-lg @3xl:text-sm @5xl:text-sm"
          style={{
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-title)',
          }}
        >
          {produto.nome}
        </p>
        <p
          className="shrink-0 text-base font-bold @sm:text-lg @3xl:text-sm @5xl:text-sm"
          style={{
            color: 'var(--delivery-primary)',
            fontFamily: 'var(--delivery-font-body)',
          }}
        >
          {formatDeliveryCurrency(produto.preco)}
        </p>
      </div>
      {produto.descricao ? (
        <p className="delivery-text-secondary line-clamp-2 text-xs leading-snug @sm:text-sm @3xl:text-xs @5xl:line-clamp-1">
          {produto.descricao}
        </p>
      ) : null}
    </div>
  )

  if (interactive && onClick) {
    return (
      <div
        className="w-full overflow-hidden rounded-2xl border shadow-sm transition-shadow hover:shadow-md"
        style={cardStyle}
      >
        {media}
        <button type="button" onClick={handleOpen} className="w-full text-left">
          {body}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border shadow-sm" style={cardStyle}>
      {media}
      {body}
    </div>
  )
}
