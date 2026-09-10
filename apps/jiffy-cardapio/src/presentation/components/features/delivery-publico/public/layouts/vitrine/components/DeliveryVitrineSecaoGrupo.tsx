'use client'

import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../../shared/constants/deliveryPublicoSugestoes'
import { DeliverySecaoSugestoes } from '../../../../shared/components/DeliverySecaoSugestoes'
import { DeliveryVitrineProdutoCard } from './DeliveryVitrineProdutoCard'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryVitrineSecaoGrupoProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  denseTop?: boolean
  onProdutoClick?: (produtoId: string) => void
}

export function DeliveryVitrineSecaoGrupo({
  config,
  grupo,
  interactive = false,
  denseTop = false,
  onProdutoClick,
}: DeliveryVitrineSecaoGrupoProps) {
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
    <section className={`${denseTop ? 'mt-2' : 'mt-5'} px-4`} id={`grupo-${grupo.id}`}>
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
