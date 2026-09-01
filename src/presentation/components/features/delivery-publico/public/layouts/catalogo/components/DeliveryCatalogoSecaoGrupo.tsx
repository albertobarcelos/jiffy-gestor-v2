'use client'

import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../../shared/constants/deliveryPublicoSugestoes'
import { DeliverySecaoSugestoes } from '../../../../shared/components/DeliverySecaoSugestoes'
import { DeliveryCatalogoProdutoCard } from './DeliveryCatalogoProdutoCard'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryCatalogoSecaoGrupoProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  denseTop?: boolean
  onProdutoClick?: (produtoId: string) => void
}

export function DeliveryCatalogoSecaoGrupo({
  config,
  grupo,
  interactive = false,
  denseTop = false,
  onProdutoClick,
}: DeliveryCatalogoSecaoGrupoProps) {
  if (grupo.produtos.length === 0) return null

  if (grupo.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID) {
    return (
      <DeliverySecaoSugestoes
        config={config}
        grupo={grupo}
        interactive={interactive}
        onProdutoClick={onProdutoClick}
      />
    )
  }

  return (
    <section className={`${denseTop ? 'mt-2' : 'mt-5'}`} id={`grupo-${grupo.id}`}>
      <h2
        className="mb-3 px-4 text-lg font-bold @sm:text-xl"
        style={{
          color: 'var(--delivery-primary)',
          fontFamily: 'var(--delivery-font-title)',
        }}
      >
        {grupo.nome}
      </h2>

      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 scroll-pr-4 px-4 pb-1 scrollbar-hide [scroll-padding-inline:1rem]">
        {grupo.produtos.map(produto => (
          <div
            key={produto.id}
            className="w-[min(68%,14.5rem)] shrink-0 snap-start @sm:w-[min(62%,15.5rem)]"
          >
            <DeliveryCatalogoProdutoCard
              produto={produto}
              interactive={interactive}
              onClick={onProdutoClick}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
