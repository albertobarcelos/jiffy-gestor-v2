'use client'

import { Camera, Plus } from 'lucide-react'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'
import { DeliveryPublicoMidiaImagem } from '../../../../shared/media/DeliveryPublicoMidiaImagem'
import { DELIVERY_IMAGEM_SIZES } from '../../../../shared/media/deliveryPublicoImageHosts'
import { DeliveryProdutoPreco } from '../../../../shared/components/DeliveryProdutoPreco'

type DeliveryVitrineProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  priority?: boolean
  quantidadeNoCarrinho?: number
  onClick?: (produtoId: string) => void
  /** Atalho +: sem complemento adiciona; com complemento abre o detalhe. */
  onAddRapido?: (produtoId: string) => void
  /** Clique na bolinha de quantidade → abre o carrinho. */
  onAbrirCarrinho?: () => void
}

export function DeliveryVitrineProdutoCard({
  produto,
  interactive = false,
  priority = false,
  quantidadeNoCarrinho = 0,
  onClick,
  onAddRapido,
  onAbrirCarrinho,
}: DeliveryVitrineProdutoCardProps) {
  const cardStyle = {
    backgroundColor: 'var(--delivery-surface)',
    borderColor: 'var(--delivery-card-border)',
  } as const

  const handleOpenProduto = () => {
    onClick?.(produto.id)
  }

  const mostrarBotaoAdd =
    interactive && (produto.temComplementos ? Boolean(onClick) : Boolean(onAddRapido))

  const handleAddClick = () => {
    if (produto.temComplementos) {
      handleOpenProduto()
      return
    }
    onAddRapido?.(produto.id)
  }

  const media = produto.imagemUrl ? (
    <DeliveryPublicoMidiaImagem
      src={produto.imagemUrl}
      sizes={DELIVERY_IMAGEM_SIZES.vitrineCard}
      priority={priority}
      produtoId={produto.id}
      className="object-contain object-center"
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center">
      <Camera className="h-12 w-12" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
    </div>
  )

  return (
    <div
      className="w-full overflow-hidden rounded-2xl border text-left shadow-sm transition-shadow hover:shadow-md"
      style={cardStyle}
    >
      <div
        className="relative aspect-square w-full border-b"
        style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
      >
        {interactive && onClick ? (
          <button
            type="button"
            onClick={handleOpenProduto}
            aria-label={`Ver detalhes de ${produto.nome}`}
            className="absolute inset-0"
          >
            {media}
          </button>
        ) : (
          media
        )}

        {mostrarBotaoAdd ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              handleAddClick()
            }}
            aria-label={
              produto.temComplementos
                ? `Escolher opções de ${produto.nome}`
                : `Adicionar ${produto.nome} ao carrinho`
            }
            className="absolute bottom-2 right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-transform active:scale-95 @lg:h-11 @lg:w-11"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              borderColor: '#4b5563',
            }}
          >
            <Plus
              className="h-5 w-5"
              strokeWidth={2.5}
              style={{ color: 'var(--delivery-primary)' }}
              aria-hidden
            />
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-3">
        {interactive && onClick ? (
          <button type="button" onClick={handleOpenProduto} className="min-w-0 flex-1 text-left">
            <p
              className="truncate text-base font-bold @sm:text-lg"
              style={{
                color: 'var(--delivery-text)',
                fontFamily: 'var(--delivery-font-title)',
              }}
            >
              {produto.nome}
            </p>
          </button>
        ) : (
          <p
            className="min-w-0 flex-1 truncate text-base font-bold @sm:text-lg"
            style={{
              color: 'var(--delivery-text)',
              fontFamily: 'var(--delivery-font-title)',
            }}
          >
            {produto.nome}
          </p>
        )}

        <div className="relative shrink-0">
          {interactive && onClick ? (
            <button type="button" onClick={handleOpenProduto} className="block text-left">
              <DeliveryProdutoPreco
                produto={produto}
                align="end"
                size="md"
                className="mt-0 shrink-0"
              />
            </button>
          ) : (
            <DeliveryProdutoPreco
              produto={produto}
              align="end"
              size="md"
              className="mt-0 shrink-0"
            />
          )}
          {quantidadeNoCarrinho > 0 ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                onAbrirCarrinho?.()
              }}
              aria-label={`${quantidadeNoCarrinho} no carrinho — editar ${produto.nome}`}
              className="absolute bottom-0 left-0 z-10 flex h-5 min-w-5 -translate-x-[35%] translate-y-[40%] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm transition-transform active:scale-95"
            >
              {quantidadeNoCarrinho > 99 ? '99+' : quantidadeNoCarrinho}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
