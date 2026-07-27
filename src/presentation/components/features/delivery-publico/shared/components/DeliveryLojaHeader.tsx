'use client'

import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

type DeliveryLojaHeaderProps = {
  config: DeliveryPublicoDesignConfig
}

/** Altura fluida da capa: cresce com a largura, com teto no desktop. */
const CAPA_HEIGHT = 'clamp(7rem, 28vw, 16rem)'

/** Capa da loja (sem logo/nome — esses ficam no topnav do layout básico). */
export function DeliveryLojaHeader({ config }: DeliveryLojaHeaderProps) {
  const capaUrl = config.cabecalho.capaUrl

  return (
    <div
      className="relative mt-5 w-full overflow-hidden lg:rounded-2xl"
      style={{
        height: CAPA_HEIGHT,
        backgroundColor: 'var(--delivery-hero-bg)',
      }}
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
