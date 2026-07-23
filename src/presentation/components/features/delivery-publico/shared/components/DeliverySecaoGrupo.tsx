'use client'

import { DeliveryProdutoListItem } from './DeliveryProdutoListItem'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'

type DeliverySecaoGrupoProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  stickyTitle?: boolean
  onProdutoClick?: (produtoId: string) => void
}

export function DeliverySecaoGrupo({
  grupo,
  interactive = false,
  stickyTitle = false,
  onProdutoClick,
}: DeliverySecaoGrupoProps) {
  if (grupo.produtos.length === 0) return null

  return (
    <section
      className={`mt-5${stickyTitle ? ' delivery-basico-grupo-section px-4' : ' px-4'}`}
      id={`grupo-${grupo.id}`}
    >
      <h2
        className={`delivery-grupo-title mb-2 flex min-h-12 items-center rounded-lg px-4 py-2.5 text-base font-bold uppercase tracking-wide @sm:min-h-14 @sm:text-lg @lg:min-h-16 @lg:text-xl @xl:text-2xl${
          stickyTitle ? ' delivery-basico-grupo-title-sticky' : ''
        }`}
      >
        <span className="min-w-0 leading-tight">{grupo.nome}</span>
      </h2>
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2 @lg:gap-4">
        {grupo.produtos.map(produto => (
          <div key={produto.id} className="min-w-0">
            <DeliveryProdutoListItem
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
