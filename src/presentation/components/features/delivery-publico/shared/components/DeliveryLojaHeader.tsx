'use client'

import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

type DeliveryLojaHeaderProps = {
  config: DeliveryPublicoDesignConfig
}

/** Capa da loja (sem logo/nome — esses ficam no topnav do layout básico). */
export function DeliveryLojaHeader({ config }: DeliveryLojaHeaderProps) {
  const capaUrl = config.cabecalho.capaUrl

  return (
    <div
      className="delivery-loja-capa relative mt-5 h-auto w-full overflow-hidden lg:rounded-2xl"
      style={{ backgroundColor: 'var(--delivery-hero-bg)' }}
      role="img"
      aria-label="Capa da loja"
    >
      {capaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={capaUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : null}
    </div>
  )
}
