'use client'

import { DeliveryGradeProdutoCard } from './DeliveryGradeProdutoCard'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryGradeSecaoGrupoProps = {
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  onProdutoClick?: (produtoId: string) => void
}

export function DeliveryGradeSecaoGrupo({
  grupo,
  interactive = false,
  onProdutoClick,
}: DeliveryGradeSecaoGrupoProps) {
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
      <div className="grid grid-cols-2 gap-3 @lg:gap-4">
        {grupo.produtos.map(produto => (
          <DeliveryGradeProdutoCard
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
