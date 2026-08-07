'use client'

import { Camera, Plus } from 'lucide-react'
import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../types/deliveryPublicoViewModel'

type DeliverySugestoesProdutoCardProps = {
  produto: DeliveryPublicoProdutoViewModel
  interactive?: boolean
  quantidadeNoCarrinho?: number
  onClick?: (produtoId: string) => void
  onAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

/**
 * Card vertical do carrossel Sugestões / Peça Também: imagem → preço → nome.
 */
export function DeliverySugestoesProdutoCard({
  produto,
  interactive = false,
  quantidadeNoCarrinho = 0,
  onClick,
  onAddRapido,
  onAbrirCarrinho,
}: DeliverySugestoesProdutoCardProps) {
  const podeAddRapido = interactive && !produto.temComplementos && Boolean(onAddRapido)
  const handleOpen = () => onClick?.(produto.id)

  return (
    <article className="w-[7.25rem] shrink-0 snap-start @sm:w-32 @lg:w-[8.5rem]">
      <div
        className="relative aspect-square w-full overflow-hidden rounded-lg border"
        style={{ backgroundColor: '#ffffff', borderColor: '#e5e7eb' }}
      >
        {produto.imagemUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produto.imagemUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera
              className="h-6 w-6"
              style={{ color: 'var(--delivery-text-muted)' }}
              aria-hidden
            />
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
            className="absolute bottom-1.5 left-1.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm"
          >
            {quantidadeNoCarrinho > 99 ? '99+' : quantidadeNoCarrinho}
          </button>
        ) : null}

        {podeAddRapido ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation()
              onAddRapido?.(produto.id)
            }}
            aria-label={`Adicionar ${produto.nome} ao carrinho`}
            className="absolute bottom-1.5 right-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.92)' }}
          >
            <Plus
              className="h-4 w-4"
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
        className="mt-1.5 w-full text-left disabled:pointer-events-none"
      >
        <p
          className="text-sm font-medium leading-snug"
          style={{
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-body)',
          }}
        >
          {formatDeliveryCurrency(produto.preco)}
        </p>
        <p
          className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug"
          style={{
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-title)',
          }}
        >
          {produto.nome}
        </p>
      </button>
    </article>
  )
}
