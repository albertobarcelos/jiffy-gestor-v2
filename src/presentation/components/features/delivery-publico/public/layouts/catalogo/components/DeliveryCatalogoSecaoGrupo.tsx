'use client'

import { useHorizontalDragScroll } from '@/src/presentation/hooks/useHorizontalDragScroll'
import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../../shared/constants/deliveryPublicoSugestoes'
import { DeliveryGrupoTituloBar } from '../../../../shared/components/DeliveryGrupoTituloBar'
import { DeliverySecaoSugestoes } from '../../../../shared/components/DeliverySecaoSugestoes'
import { DeliveryCatalogoProdutoCard } from './DeliveryCatalogoProdutoCard'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryCatalogoSecaoGrupoProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  denseTop?: boolean
  quantidadePorProduto?: Record<string, number>
  onProdutoClick?: (produtoId: string) => void
  onProdutoAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

/**
 * Prateleira horizontal por grupo — identidade do modelo Catálogo
 * (diferente do grid vertical da Grade / Vitrine).
 */
export function DeliveryCatalogoSecaoGrupo({
  config,
  grupo,
  interactive = false,
  denseTop = false,
  quantidadePorProduto,
  onProdutoClick,
  onProdutoAddRapido,
  onAbrirCarrinho,
}: DeliveryCatalogoSecaoGrupoProps) {
  const {
    scrollRef,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
  } = useHorizontalDragScroll<HTMLDivElement>()

  if (grupo.produtos.length === 0) return null

  if (grupo.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID) {
    return (
      <DeliverySecaoSugestoes
        config={config}
        grupo={grupo}
        interactive={interactive}
        quantidadePorProduto={quantidadePorProduto}
        onProdutoClick={onProdutoClick}
        onProdutoAddRapido={onProdutoAddRapido}
        onAbrirCarrinho={onAbrirCarrinho}
      />
    )
  }

  return (
    <section
      className={`${denseTop ? 'mt-2' : 'mt-5'} delivery-publico-grupo-section`}
      id={`grupo-${grupo.id}`}
    >
      <div className="px-4">
        <DeliveryGrupoTituloBar
          config={config}
          nome={grupo.nome}
          imagemUrl={grupo.imagemUrl}
        />
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden scroll-pl-4 scroll-pr-4 px-4 pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {grupo.produtos.map(produto => (
          <div
            key={produto.id}
            className="w-[min(32%,10.5rem)] shrink-0 snap-start @sm:w-[min(30%,12rem)] @lg:w-[min(24%,14rem)] @5xl:w-[min(20%,15rem)]"
          >
            <DeliveryCatalogoProdutoCard
              produto={produto}
              interactive={interactive}
              quantidadeNoCarrinho={quantidadePorProduto?.[produto.id] ?? 0}
              onClick={onProdutoClick}
              onAddRapido={onProdutoAddRapido}
              onAbrirCarrinho={onAbrirCarrinho}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
