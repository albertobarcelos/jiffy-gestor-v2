'use client'

import { Camera, Plus } from 'lucide-react'
import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../types/deliveryPublicoViewModel'

type DeliveryProdutoListItemProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  /** Unidades deste produto já no carrinho (soma de linhas). */
  quantidadeNoCarrinho?: number
  onClick?: (produtoId: string) => void
  /** Atalho: adiciona direto ao carrinho (só produtos sem complemento). */
  onAddRapido?: (produtoId: string) => void
  /** Clique na bolinha de quantidade → abre o carrinho. */
  onAbrirCarrinho?: () => void
}

const cardClassName =
  'flex h-full w-full overflow-hidden rounded-lg border text-left transition-colors'

const textClassName =
  'min-w-0 flex-1 py-3.5 pl-3.5 pr-3 @sm:py-3 @sm:pl-3 @sm:pr-2.5 @lg:py-4 @lg:pl-4 @lg:pr-3'

function ProdutoThumb({
  imagemUrl,
  produtoNome,
  interactive,
  onOpenClick,
  onAddClick,
}: {
  imagemUrl: string | null
  produtoNome: string
  interactive: boolean
  onOpenClick?: () => void
  onAddClick?: () => void
}) {
  const media = imagemUrl ? (
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
  )

  return (
    <div
      className="relative w-28 min-h-28 shrink-0 self-stretch border-l @lg:w-36 @lg:min-h-36 @xl:w-40 @xl:min-h-40"
      style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
    >
      {interactive && onOpenClick ? (
        <button
          type="button"
          onClick={onOpenClick}
          aria-label={`Ver detalhes de ${produtoNome}`}
          className="absolute inset-0"
        >
          {media}
        </button>
      ) : (
        media
      )}

      {interactive && onAddClick ? (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation()
            onAddClick()
          }}
          aria-label={`Adicionar ${produtoNome} ao carrinho`}
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

function QuantidadeCarrinhoBadge({
  quantidade,
  produtoNome,
  onClick,
}: {
  quantidade: number
  produtoNome: string
  onClick?: () => void
}) {
  if (quantidade <= 0) return null

  const className =
    'absolute bottom-2.5 left-3.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm transition-transform active:scale-95 @lg:bottom-3 @lg:left-4 @lg:h-6 @lg:min-w-6 @lg:text-xs'
  const label = `${quantidade} no carrinho — editar ${produtoNome}`
  const content = quantidade > 99 ? '99+' : quantidade

  if (onClick) {
    return (
      <button
        type="button"
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
        aria-label={label}
        className={className}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={`${className} pointer-events-none`} aria-label={`${quantidade} no carrinho`}>
      {content}
    </span>
  )
}

export function DeliveryProdutoListItem({
  produto,
  interactive = false,
  quantidadeNoCarrinho = 0,
  onClick,
  onAddRapido,
  onAbrirCarrinho,
}: DeliveryProdutoListItemProps) {
  const cardStyle = {
    backgroundColor: 'var(--delivery-surface)',
    borderColor: 'var(--delivery-card-border)',
  } as const

  const handleOpenProduto = () => {
    onClick?.(produto.id)
  }

  const podeAddRapido = interactive && !produto.temComplementos && Boolean(onAddRapido)

  if (interactive && onClick) {
    return (
      <div
        className={`relative ${cardClassName} hover:border-[color-mix(in_srgb,var(--delivery-primary)_24%,transparent)]`}
        style={cardStyle}
      >
        <button
          type="button"
          onClick={handleOpenProduto}
          className={`${textClassName} text-left${quantidadeNoCarrinho > 0 ? ' pb-9 @lg:pb-10' : ''}`}
        >
          <p
            className="text-base font-medium leading-snug @lg:text-lg"
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
              color: 'var(--delivery-text)',
              fontFamily: 'var(--delivery-font-body)',
            }}
          >
            {formatDeliveryCurrency(produto.preco)}
          </p>
        </button>
        <QuantidadeCarrinhoBadge
          quantidade={quantidadeNoCarrinho}
          produtoNome={produto.nome}
          onClick={onAbrirCarrinho}
        />
        <ProdutoThumb
          imagemUrl={produto.imagemUrl}
          produtoNome={produto.nome}
          interactive
          onOpenClick={handleOpenProduto}
          onAddClick={podeAddRapido ? () => onAddRapido?.(produto.id) : undefined}
        />
      </div>
    )
  }

  return (
    <div className={`relative ${cardClassName}`} style={cardStyle}>
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
      <QuantidadeCarrinhoBadge quantidade={quantidadeNoCarrinho} produtoNome={produto.nome} />
      <ProdutoThumb
        imagemUrl={produto.imagemUrl}
        produtoNome={produto.nome}
        interactive={false}
      />
    </div>
  )
}
