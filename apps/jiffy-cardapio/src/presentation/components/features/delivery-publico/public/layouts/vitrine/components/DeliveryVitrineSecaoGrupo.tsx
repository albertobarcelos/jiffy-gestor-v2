'use client'

import { DELIVERY_PUBLICO_GRUPO_SUGESTOES_ID } from '../../../../shared/constants/deliveryPublicoSugestoes'
import { DeliverySecaoSugestoes } from '../../../../shared/components/DeliverySecaoSugestoes'
import { DeliveryVitrineProdutoCard } from './DeliveryVitrineProdutoCard'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import type { DeliveryPublicoGrupoViewModel } from '../../../../shared/types/deliveryPublicoViewModel'
import { devePriorizarImagemProduto } from '../../../../shared/media/deliveryPublicoImageHosts'
import { resolveGrupoTituloBarStyle } from '../../../../shared/utils/resolveGrupoTituloBarStyle'

type DeliveryVitrineSecaoGrupoProps = {
  config: DeliveryPublicoDesignConfig
  grupo: DeliveryPublicoGrupoViewModel
  interactive?: boolean
  denseTop?: boolean
  primeirasImagensPriority?: boolean
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
  primeirasImagensPriority = false,
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
        primeirasImagensPriority={primeirasImagensPriority}
        quantidadePorProduto={quantidadePorProduto}
        onProdutoClick={onProdutoClick}
        onProdutoAddRapido={onProdutoAddRapido}
        onAbrirCarrinho={onAbrirCarrinho}
      />
    )
  }

  const tituloStyle = resolveGrupoTituloBarStyle({
    config,
    imagemUrl: grupo.imagemUrl,
  })
  const mostrarNome = config.categorias.mostrarNomeTitulo !== false

  return (
    <section
      className={`delivery-basico-grupo-section ${denseTop ? 'mt-2' : 'mt-5'} px-4`}
      id={`grupo-${grupo.id}`}
    >
      <h2
        className="delivery-grupo-title mb-3 flex min-h-12 items-center rounded-lg px-4 py-2.5 text-base uppercase tracking-wide @sm:min-h-14 @sm:text-lg @lg:min-h-20 @lg:py-4 @lg:text-xl @xl:min-h-20 @xl:text-2xl"
        style={{
          ...tituloStyle,
          fontFamily: 'var(--delivery-font-title)',
        }}
        aria-label={grupo.nome}
      >
        {mostrarNome ? <span className="min-w-0 leading-tight">{grupo.nome}</span> : null}
      </h2>
      <div className="grid grid-cols-1 gap-4 @lg:grid-cols-3">
        {grupo.produtos.map((produto, index) => (
          <DeliveryVitrineProdutoCard
            key={produto.id}
            produto={produto}
            interactive={interactive}
            priority={devePriorizarImagemProduto(primeirasImagensPriority, index)}
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
