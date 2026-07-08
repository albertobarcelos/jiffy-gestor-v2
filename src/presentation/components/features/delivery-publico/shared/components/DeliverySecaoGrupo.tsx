'use client'

import { DeliveryProdutoListItem } from './DeliveryProdutoListItem'
import type { DeliveryPublicoGrupoViewModel } from '../types/deliveryPublicoViewModel'

type DeliverySecaoGrupoProps = {
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  onProdutoClick?: (produtoId: string) => void
}

export function DeliverySecaoGrupo({
  grupo,
  interactive = false,
  onProdutoClick,
}: DeliverySecaoGrupoProps) {
  if (grupo.produtos.length === 0) return null

  return (
    <section className="mt-5 px-4" id={`grupo-${grupo.id}`}>
      <h2
        className="mb-2 text-base font-bold sm:text-lg"
        style={{
          color: 'var(--delivery-text)',
          fontFamily: 'var(--delivery-font-title)',
        }}
      >
        {grupo.nome}
      </h2>
      <div className="space-y-2">
        {grupo.produtos.map(produto => (
          <DeliveryProdutoListItem
            key={produto.id}
            produto={produto}
            interactive={interactive}
            onClick={onProdutoClick}
          />
        ))}
      </div>
    </section>
  )
}
