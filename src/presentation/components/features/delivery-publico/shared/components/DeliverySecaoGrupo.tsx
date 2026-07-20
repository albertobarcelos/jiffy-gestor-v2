'use client'

import { DeliveryProdutoListItem } from './DeliveryProdutoListItem'
import {
  DeliveryGrupoCategoriaVisual,
  shouldUseGrupoImagem,
} from './DeliveryGrupoCategoriaVisual'
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
  config,
  grupo,
  interactive = false,
  stickyTitle = false,
  onProdutoClick,
}: DeliverySecaoGrupoProps) {
  if (grupo.produtos.length === 0) return null

  const showImagem = shouldUseGrupoImagem(config, grupo)

  return (
    <section
      className={`mt-5${stickyTitle ? ' delivery-basico-grupo-section px-4' : ' px-4'}`}
      id={`grupo-${grupo.id}`}
    >
      <h2
        className={`delivery-grupo-title relative mb-2 flex min-h-12 items-center overflow-hidden rounded-xl px-4 py-2.5 text-base font-bold uppercase tracking-wide bg-[color:var(--delivery-primary-dark,#171717)] text-[color:var(--delivery-btn-text,#ffffff)] @sm:min-h-14 @sm:text-lg @lg:min-h-16 @lg:text-xl @xl:text-2xl${
          stickyTitle ? ' delivery-basico-grupo-title-sticky' : ''
        } pr-28 @sm:pr-36 @lg:pr-44`}
      >
        <span className="relative z-10 min-w-0 leading-tight text-[color:var(--delivery-btn-text,#ffffff)]">
          {grupo.nome}
        </span>

        <span
          className="delivery-grupo-title-image pointer-events-none absolute right-3 top-1/2 z-0 aspect-square h-[170%] -translate-y-1/2 @sm:right-4"
          aria-hidden
        >
          <span className="delivery-grupo-title-image-smoke" />
          {showImagem ? (
            <span className="delivery-grupo-title-image-photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={grupo.imagemUrl!.trim()}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
          ) : (
            <span className="delivery-grupo-title-image-photo flex items-center justify-center">
              <DeliveryGrupoCategoriaVisual
                config={config}
                grupo={grupo}
                size="lg"
                className="!h-full !w-full !min-h-0 !min-w-0"
              />
            </span>
          )}
        </span>
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
