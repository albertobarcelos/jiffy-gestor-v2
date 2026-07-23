'use client'

import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

type DeliveryLojaHeaderProps = {
  config: DeliveryPublicoDesignConfig
}

/** Capa da loja (sem logo/nome — esses ficam no topnav do layout básico). */
export function DeliveryLojaHeader({ config }: DeliveryLojaHeaderProps) {
  return (
    <div
      className="relative h-28 bg-cover bg-center @sm:h-32 @lg:h-36"
      style={{
        backgroundColor: 'var(--delivery-hero-bg)',
        backgroundImage: config.cabecalho.capaUrl ? `url(${config.cabecalho.capaUrl})` : undefined,
      }}
      role="img"
      aria-label="Capa da loja"
    />
  )
}
