'use client'

import { Camera, Plus } from 'lucide-react'
import type { DeliveryPublicoProdutoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'
import { DeliveryPublicoMidiaImagem } from '../../../../shared/media/DeliveryPublicoMidiaImagem'
import { DELIVERY_IMAGEM_SIZES } from '../../../../shared/media/deliveryPublicoImageHosts'
import { DeliveryProdutoPreco } from '../../../../shared/components/DeliveryProdutoPreco'

type DeliveryGradeProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  priority?: boolean
  quantidadeNoCarrinho?: number
  onClick?: (produtoId: string) => void
  onAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

export function DeliveryGradeProdutoCard({
  produto,
  interactive = false,
  priority = false,
  quantidadeNoCarrinho = 0,
  onClick,
  onAddRapido,
  onAbrirCarrinho,
}: DeliveryGradeProdutoCardProps) {
  const handleOpen = () => onClick?.(produto.id)
  const mostrarBotaoAdd =
    interactive && (produto.temComplementos ? Boolean(onClick) : Boolean(onAddRapido))
  const handleAddClick = () => {
    if (produto.temComplementos) {
      onClick?.(produto.id)
      return
    }
    onAddRapido?.(produto.id)
  }

  return (
    <article className="w-full text-left">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl border"
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
            className="rounded-xl object-contain object-center"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="h-8 w-8" style={{ color: 'var(--delivery-text-muted)' }} aria-hidden />
          </div>
        )}

        {interactive && onClick ? (
          <button
            type="button"
            onClick={handleOpen}
            aria-label={`Ver detalhes de ${produto.nome}`}
            className="absolute inset-0"
          />
        ) : null}

        {quantidadeNoCarrinho > 0 ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onAbrirCarrinho?.()
            }}
            aria-label={`${quantidadeNoCarrinho} no carrinho — editar ${produto.nome}`}
            className="absolute bottom-1.5 left-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white shadow-sm @lg:h-6 @lg:min-w-6 @lg:text-xs"
          >
            {quantidadeNoCarrinho > 99 ? '99+' : quantidadeNoCarrinho}
          </button>
        ) : null}

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
            className="absolute bottom-1.5 right-1.5 z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-transform active:scale-95"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.92)',
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

      <button
        type="button"
        disabled={!interactive || !onClick}
        onClick={handleOpen}
        className="mt-2 w-full text-left disabled:pointer-events-none"
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
        <DeliveryProdutoPreco produto={produto} className="mt-0.5" />
      </button>
    </article>
  )
}
