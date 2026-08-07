'use client'

import { useHorizontalDragScroll } from '@/src/presentation/hooks/useHorizontalDragScroll'
import type { PecaTambemProdutoDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import type { DeliveryPublicoProdutoViewModel } from '../types/deliveryPublicoViewModel'
import { DeliverySugestoesProdutoCard } from './DeliverySugestoesProdutoCard'

type DeliveryPecaTambemCarouselProps = {
  produtos: PecaTambemProdutoDTO[]
  quantidadePorProduto?: Record<string, number>
  onProdutoClick: (produtoId: string) => void
  onProdutoAddRapido: (produtoId: string) => void
}

function toViewModel(produto: PecaTambemProdutoDTO): DeliveryPublicoProdutoViewModel {
  return {
    id: produto.id,
    nome: produto.nome,
    descricao: produto.descricao,
    preco: produto.valor,
    imagemUrl: produto.imagemUrl,
    grupoId: produto.grupoId || produto.grupoIdOrigem,
    temComplementos:
      produto.abreComplementos && produto.grupoComplementosIds.length > 0,
  }
}

/** Carrossel "Peça Também" exibido abaixo dos itens do carrinho público. */
export function DeliveryPecaTambemCarousel({
  produtos,
  quantidadePorProduto,
  onProdutoClick,
  onProdutoAddRapido,
}: DeliveryPecaTambemCarouselProps) {
  const {
    scrollRef,
    isDragging,
    handleMouseDown,
    handleWheel,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleClickCapture,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useHorizontalDragScroll<HTMLDivElement>()

  if (produtos.length === 0) return null

  return (
    <section className="mt-1" aria-label="Peça Também">
      <h2
        className="mb-2 px-0.5 text-sm font-medium tracking-wide"
        style={{ color: 'var(--delivery-text-primary)' }}
      >
        Peça Também
      </h2>
      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClickCapture={handleClickCapture}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`flex items-start gap-3 overflow-x-auto pb-1 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {produtos.map(produto => (
          <DeliverySugestoesProdutoCard
            key={produto.id}
            produto={toViewModel(produto)}
            interactive
            quantidadeNoCarrinho={quantidadePorProduto?.[produto.id] ?? 0}
            onClick={onProdutoClick}
            onAddRapido={onProdutoAddRapido}
          />
        ))}
      </div>
    </section>
  )
}
