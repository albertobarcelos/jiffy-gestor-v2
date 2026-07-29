'use client'

import { useHorizontalDragScroll } from '@/src/presentation/hooks/useHorizontalDragScroll'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../constants/deliveryPublicoSugestoes'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'
import { DeliverySugestoesProdutoCard } from './DeliverySugestoesProdutoCard'

type DeliverySecaoSugestoesProps = {
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  stickyTitle?: boolean
  quantidadePorProduto?: Record<string, number>
  onProdutoClick?: (produtoId: string) => void
  onProdutoAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

/** Seção horizontal rolável do grupo sintético Sugestões da Casa. */
export function DeliverySecaoSugestoes({
  grupo,
  interactive = false,
  stickyTitle = false,
  quantidadePorProduto,
  onProdutoClick,
  onProdutoAddRapido,
  onAbrirCarrinho,
}: DeliverySecaoSugestoesProps) {
  const {
    scrollRef,
    isDragging,
    handleMouseDown,
    handleWheel,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useHorizontalDragScroll<HTMLDivElement>()

  if (grupo.produtos.length === 0) return null

  return (
    <section
      className={`mt-5 mb-0${stickyTitle ? ' delivery-basico-grupo-section' : ''}`}
      id={`grupo-${grupo.id || DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID}`}
    >
      <h2
        className={`delivery-grupo-title mx-4 mb-2 flex min-h-12 items-center rounded-lg px-4 py-2.5 text-base uppercase tracking-wide @sm:min-h-14 @sm:text-lg @lg:min-h-16 @lg:text-xl @xl:text-2xl${
          stickyTitle ? ' delivery-basico-grupo-title-sticky' : ''
        }`}
      >
        <span className="min-w-0 leading-tight">{grupo.nome}</span>
      </h2>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        className={`flex items-start gap-3 overflow-x-auto px-4 pb-0 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {grupo.produtos.map(produto => (
          <DeliverySugestoesProdutoCard
            key={produto.id}
            produto={produto}
            interactive={interactive}
            quantidadeNoCarrinho={quantidadePorProduto?.[produto.id] ?? 0}
            onClick={onProdutoClick}
            onAddRapido={onProdutoAddRapido}
            onAbrirCarrinho={onAbrirCarrinho}
          />
        ))}
      </div>
    </section>
  )
}
