'use client'

import { Camera, Plus } from 'lucide-react'
import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../types/deliveryPublicoViewModel'

type DeliveryProdutoListItemProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  onClick?: (produtoId: string) => void
}

const cardClassName =
  'flex h-full w-full overflow-hidden rounded-lg border text-left transition-colors'

const textClassName =
  'min-w-0 flex-1 py-3.5 pl-3.5 pr-3 @sm:py-3 @sm:pl-3 @sm:pr-2.5 @lg:py-4 @lg:pl-4 @lg:pr-3'

function ProdutoThumb({
  imagemUrl,
  produtoNome,
  interactive,
  onAddClick,
}: {
  imagemUrl: string | null
  produtoNome: string
  interactive: boolean
  onAddClick?: () => void
}) {
  return (
    <div
      className="relative w-28 min-h-28 shrink-0 self-stretch border-l @lg:w-36 @lg:min-h-36 @xl:w-40 @xl:min-h-40"
      style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
    >
      {imagemUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imagemUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera
            className="h-8 w-8 @lg:h-9 @lg:w-9"
            style={{ color: 'var(--delivery-text-muted)' }}
            aria-hidden
          />
        </div>
      )}

      {interactive && onAddClick ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onAddClick()
          }}
          aria-label={`Adicionar ${produtoNome}`}
          className="absolute bottom-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95 @lg:h-9 @lg:w-9"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
        >
          <Plus
            className="h-5 w-5 @lg:h-5 @lg:w-5"
            strokeWidth={2.5}
            style={{ color: 'var(--delivery-primary)' }}
            aria-hidden
          />
        </button>
      ) : null}
    </div>
  )
}

export function DeliveryProdutoListItem({
  produto,
  interactive = false,
  onClick,
}: DeliveryProdutoListItemProps) {
  const cardStyle = {
    backgroundColor: 'var(--delivery-surface)',
    borderColor: 'var(--delivery-card-border)',
  } as const

  const handleOpenProduto = () => {
    onClick?.(produto.id)
  }

  if (interactive && onClick) {
    return (
      <div
        className={`${cardClassName} hover:border-[color-mix(in_srgb,var(--delivery-primary)_24%,transparent)]`}
        style={cardStyle}
      >
        <button
          type="button"
          onClick={handleOpenProduto}
          className={`${textClassName} text-left`}
        >
          <p
            className="text-base font-semibold leading-snug @lg:text-lg"
            style={{
              color: 'var(--delivery-text)',
              fontFamily: 'var(--delivery-font-title)',
            }}
          >
            {produto.nome}
          </p>
          {produto.descricao ? (
            <p className="delivery-text-secondary mt-0.5 line-clamp-2 text-xs leading-snug @lg:mt-1 @lg:text-sm">
              {produto.descricao}
            </p>
          ) : null}
          <p
            className="mt-1 text-sm font-medium @lg:mt-1.5 @lg:text-base"
            style={{
              color: 'var(--delivery-primary)',
              fontFamily: 'var(--delivery-font-body)',
            }}
          >
            {formatDeliveryCurrency(produto.preco)}
          </p>
        </button>
        <ProdutoThumb
          imagemUrl={produto.imagemUrl}
          produtoNome={produto.nome}
          interactive
          onAddClick={handleOpenProduto}
        />
      </div>
    )
  }

  return (
    <div className={cardClassName} style={cardStyle}>
      <div className={textClassName}>
        <p
          className="text-base font-semibold leading-snug @lg:text-lg"
          style={{
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-title)',
          }}
        >
          {produto.nome}
        </p>
        {produto.descricao ? (
          <p className="delivery-text-secondary mt-0.5 line-clamp-2 text-xs leading-snug @lg:mt-1 @lg:text-sm">
            {produto.descricao}
          </p>
        ) : null}
        <p
          className="mt-1 text-sm font-medium @lg:mt-1.5 @lg:text-base"
          style={{
            color: 'var(--delivery-primary)',
            fontFamily: 'var(--delivery-font-body)',
          }}
        >
          {formatDeliveryCurrency(produto.preco)}
        </p>
      </div>
      <ProdutoThumb
        imagemUrl={produto.imagemUrl}
        produtoNome={produto.nome}
        interactive={false}
      />
    </div>
  )
}
