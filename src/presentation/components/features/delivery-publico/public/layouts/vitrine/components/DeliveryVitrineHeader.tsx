'use client'

import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryVitrineHeaderProps = {
  config: DeliveryPublicoDesignConfig
}

export function DeliveryVitrineHeader({ config }: DeliveryVitrineHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '12px'
  const capaUrl = config.cabecalho.capaUrl

  return (
    <header className="relative">
      {/* Base do Básico + altura mobile um pouco maior (3:1). Desktop: 300px. */}
      <div
        className="delivery-loja-capa delivery-vitrine-capa relative h-auto w-full overflow-hidden"
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

        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/55" />

        <div className="absolute left-3 top-3 z-10 @sm:left-4 @sm:top-3">
          <div
            className="flex h-11 w-11 items-center justify-center overflow-hidden border-2 border-white bg-white shadow-md @sm:h-14 @sm:w-14"
            style={{ borderRadius: logoRadius }}
          >
            {config.cabecalho.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className="text-lg font-bold @sm:text-xl"
                style={{ color: 'var(--delivery-primary)' }}
              >
                {(nomeLoja[0] ?? '?').toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-2.5 px-4 @sm:bottom-3">
          <h1
            className="truncate text-base font-bold uppercase tracking-wide text-white @sm:text-lg"
            style={{ fontFamily: 'var(--delivery-font-title)' }}
          >
            {nomeLoja}
          </h1>
        </div>
      </div>
    </header>
  )
}
