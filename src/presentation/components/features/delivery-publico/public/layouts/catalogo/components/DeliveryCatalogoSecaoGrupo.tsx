'use client'

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
    <section className={`${denseTop ? 'mt-2' : 'mt-5'}`} id={`grupo-${grupo.id}`}>
      <div className="px-4">
        <DeliveryGrupoTituloBar
          config={config}
          nome={grupo.nome}
          imagemUrl={grupo.imagemUrl}
        />
      </div>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 scroll-pr-4 px-4 pb-1 scrollbar-hide [scroll-padding-inline:1rem]">
        {grupo.produtos.map(produto => (
          <div
            key={produto.id}
            className="w-[min(68%,14.5rem)] shrink-0 snap-start @sm:w-[min(62%,15.5rem)]"
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
