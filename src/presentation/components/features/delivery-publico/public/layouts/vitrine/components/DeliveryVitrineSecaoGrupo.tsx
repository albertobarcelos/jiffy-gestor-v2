'use client'

import { DeliveryVitrineProdutoCard } from './DeliveryVitrineProdutoCard'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryVitrineSecaoGrupoProps = {
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  onProdutoClick?: (produtoId: string) => void
}

export function DeliveryVitrineSecaoGrupo({
  grupo,
  interactive = false,
  onProdutoClick,
}: DeliveryVitrineSecaoGrupoProps) {
  if (grupo.produtos.length === 0) return null

  return (
    <section className="mt-5 px-4" id={`grupo-${grupo.id}`}>
      <h2
        className="mb-3 text-lg font-bold @sm:text-xl"
        style={{
          color: 'var(--delivery-primary)',
          fontFamily: 'var(--delivery-font-title)',
        }}
      >
        {grupo.nome}
      </h2>
      <div className="flex flex-col gap-4">
        {grupo.produtos.map(produto => (
          <DeliveryVitrineProdutoCard
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
