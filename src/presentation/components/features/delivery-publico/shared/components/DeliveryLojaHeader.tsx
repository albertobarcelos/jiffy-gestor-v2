'use client'

import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'

type DeliveryLojaHeaderProps = {
  config: DeliveryPublicoDesignConfig
}

export function DeliveryLojaHeader({ config }: DeliveryLojaHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '8px'

  return (
    <div
      className="relative h-32 bg-cover bg-center sm:h-40 lg:h-48 xl:h-52"
      style={{
        backgroundColor: 'var(--delivery-hero-bg)',
        backgroundImage: config.cabecalho.capaUrl ? `url(${config.cabecalho.capaUrl})` : undefined,
      }}
    >
      <div className="absolute inset-0 flex items-end justify-between gap-3 px-4 pb-3 lg:gap-4 lg:px-6 lg:pb-4 xl:pb-5">
        <div className="min-w-0 flex-1">
          <h1
            className="truncate text-xl font-bold sm:text-2xl lg:text-3xl xl:text-4xl"
            style={{
              color: 'var(--delivery-btn-text)',
              fontFamily: 'var(--delivery-font-title)',
            }}
          >
            {nomeLoja}
          </h1>
        </div>

        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-2 border-white bg-gray-100 sm:h-16 sm:w-16 lg:h-20 lg:w-20 xl:h-24 xl:w-24"
          style={{ borderRadius: logoRadius }}
        >
          {config.cabecalho.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="text-xl font-bold lg:text-2xl xl:text-3xl"
              style={{ color: 'var(--delivery-primary)' }}
            >
              {(nomeLoja[0] ?? '?').toUpperCase()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
