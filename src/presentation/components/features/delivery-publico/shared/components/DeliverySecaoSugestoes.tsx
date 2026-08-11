'use client'

import { useHorizontalDragScroll } from '@/src/presentation/hooks/useHorizontalDragScroll'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../constants/deliveryPublicoSugestoes'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'
import { DeliverySugestoesProdutoCard } from './DeliverySugestoesProdutoCard'
import { resolveGrupoTituloBarStyle } from '../utils/resolveGrupoTituloBarStyle'

type DeliverySecaoSugestoesProps = {
  config: DeliveryPublicoDesignConfig
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
  config,
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

  const tituloStyle = resolveGrupoTituloBarStyle({
    config,
    imagemUrl: grupo.imagemUrl,
  })
  const mostrarNome = config.categorias.mostrarNomeTitulo !== false

  return (
    <section
      className={`mt-5 mb-0${stickyTitle ? ' delivery-basico-grupo-section' : ''}`}
      id={`grupo-${grupo.id || DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID}`}
    >
      <h2
        className={`delivery-grupo-title mx-4 mb-2 flex min-h-12 items-center rounded-lg px-4 py-2.5 text-base uppercase tracking-wide @sm:min-h-14 @sm:text-lg @lg:min-h-20 @lg:py-4 @lg:text-xl @xl:min-h-20 @xl:text-2xl${
          stickyTitle ? ' delivery-basico-grupo-title-sticky' : ''
        }`}
        style={tituloStyle}
        aria-label={grupo.nome}
      >
        {mostrarNome ? <span className="min-w-0 leading-tight">{grupo.nome}</span> : null}
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
