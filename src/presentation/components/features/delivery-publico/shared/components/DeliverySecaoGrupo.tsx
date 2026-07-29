'use client'

import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../constants/deliveryPublicoSugestoes'
import { DeliveryProdutoListItem } from './DeliveryProdutoListItem'
import { DeliverySecaoSugestoes } from './DeliverySecaoSugestoes'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'

type DeliverySecaoGrupoProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  stickyTitle?: boolean
  /** Reduz o espaço acima (ex.: grupo logo após Sugestões). */
  denseTop?: boolean
  quantidadePorProduto?: Record<string, number>
  onProdutoClick?: (produtoId: string) => void
  onProdutoAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

export function DeliverySecaoGrupo({
  config: _config,
  grupo,
  interactive = false,
  stickyTitle = false,
  denseTop = false,
  quantidadePorProduto,
  onProdutoClick,
  onProdutoAddRapido,
  onAbrirCarrinho,
}: DeliverySecaoGrupoProps) {
  if (grupo.produtos.length === 0) return null

  if (grupo.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID) {
    return (
      <DeliverySecaoSugestoes
        grupo={grupo}
        interactive={interactive}
        stickyTitle={stickyTitle}
        quantidadePorProduto={quantidadePorProduto}
        onProdutoClick={onProdutoClick}
        onProdutoAddRapido={onProdutoAddRapido}
        onAbrirCarrinho={onAbrirCarrinho}
      />
    )
  }

  const topClass = denseTop ? 'mt-2' : 'mt-5'

  return (
    <section
      className={`${topClass}${stickyTitle ? ' delivery-basico-grupo-section px-4' : ' px-4'}`}
      id={`grupo-${grupo.id}`}
    >
      <h2
        className={`delivery-grupo-title mb-2 flex min-h-12 items-center rounded-lg px-4 py-2.5 text-base uppercase tracking-wide @sm:min-h-14 @sm:text-lg @lg:min-h-16 @lg:text-xl @xl:text-2xl${
          stickyTitle ? ' delivery-basico-grupo-title-sticky' : ''
        }`}
      >
        <span className="min-w-0 leading-tight">{grupo.nome}</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-1 @3xl:grid-cols-2 @lg:gap-4">
        {grupo.produtos.map(produto => (
          <div key={produto.id} className="min-w-0">
            <DeliveryProdutoListItem
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
