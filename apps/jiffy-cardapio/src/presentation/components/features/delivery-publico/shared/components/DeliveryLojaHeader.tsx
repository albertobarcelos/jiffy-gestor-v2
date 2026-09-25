'use client'

import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'
import { DeliveryPublicoMidiaImagem } from '../media/DeliveryPublicoMidiaImagem'
import { DELIVERY_IMAGEM_SIZES } from '../media/deliveryPublicoImageHosts'

type DeliveryLojaHeaderProps = {
  config: DeliveryPublicoDesignConfig
}

/** Capa da loja (sem logo/nome — esses ficam no topnav do layout básico). */
export function DeliveryLojaHeader({ config }: DeliveryLojaHeaderProps) {
  const capaUrl = config.cabecalho.capaUrl

  return (
    <div
      className="delivery-loja-capa relative mt-0 h-auto w-full overflow-hidden lg:mt-5 lg:rounded-2xl"
      style={{ backgroundColor: 'var(--delivery-hero-bg)' }}
      role="img"
      aria-label="Capa da loja"
    >
      {capaUrl ? (
        <DeliveryPublicoMidiaImagem
          src={capaUrl}
          sizes={DELIVERY_IMAGEM_SIZES.capa}
          priority
          className="object-cover object-center"
        />
      ) : null}
    </div>
  )
}
