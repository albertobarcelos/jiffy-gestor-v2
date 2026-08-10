'use client'

import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../../shared/constants/deliveryPublicoSugestoes'
import { DeliveryGrupoTituloBar } from '../../../../shared/components/DeliveryGrupoTituloBar'
import { DeliverySecaoSugestoes } from '../../../../shared/components/DeliverySecaoSugestoes'
import { DeliveryVitrineProdutoCard } from './DeliveryVitrineProdutoCard'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'

type DeliveryVitrineSecaoGrupoProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  denseTop?: boolean
  quantidadePorProduto?: Record<string, number>
  onProdutoClick?: (produtoId: string) => void
  onProdutoAddRapido?: (produtoId: string) => void
  onAbrirCarrinho?: () => void
}

export function DeliveryVitrineSecaoGrupo({
  config,
  grupo,
  interactive = false,
  denseTop = false,
  quantidadePorProduto,
  onProdutoClick,
  onProdutoAddRapido,
  onAbrirCarrinho,
}: DeliveryVitrineSecaoGrupoProps) {
  if (grupo.produtos.length === 0) return null

  if (grupo.id === DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID) {
    return (
      <DeliverySecaoSugestoes
        config={config}
        grupo={grupo}
        interactive={interactive}
        stickyTitle
        quantidadePorProduto={quantidadePorProduto}
        onProdutoClick={onProdutoClick}
        onProdutoAddRapido={onProdutoAddRapido}
        onAbrirCarrinho={onAbrirCarrinho}
      />
    )
  }

  return (
    <section
      className={`${denseTop ? 'mt-2' : 'mt-5'} delivery-publico-grupo-section px-4`}
      id={`grupo-${grupo.id}`}
    >
      <DeliveryGrupoTituloBar
        config={config}
        nome={grupo.nome}
        imagemUrl={grupo.imagemUrl}
        sticky
      />
      <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-3 @5xl:grid-cols-4">
        {grupo.produtos.map(produto => (
          <DeliveryVitrineProdutoCard
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
