'use client'

import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryGradeHeaderProps = {
  config: DeliveryPublicoDesignConfig
}

export function DeliveryGradeHeader({ config }: DeliveryGradeHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '12px'
  const capaUrl = config.cabecalho.capaUrl

  return (
    <header className="relative z-20 px-2.5 pt-0">
      <div
        className="delivery-loja-capa delivery-grade-capa relative w-full overflow-hidden rounded-b-xl"
        style={{ backgroundColor: 'var(--delivery-hero-bg)' }}
        role="img"
        aria-label="Capa da loja"
      >
        {capaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capaUrl}
            alt=""
            className="relative z-0 block h-auto w-full object-contain object-center"
          />
        ) : (
          <div className="delivery-grade-capa-placeholder w-full" aria-hidden />
        )}

        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center">
          <div
            className="mb-2 flex h-14 w-14 items-center justify-center overflow-hidden border-2 border-white bg-white shadow-md @sm:mb-3"
            style={{ borderRadius: logoRadius }}
          >
            {config.cabecalho.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xl font-bold" style={{ color: 'var(--delivery-primary)' }}>
                {(nomeLoja[0] ?? '?').toUpperCase()}
              </span>
            )}
          </div>
          <h1
            className="truncate text-lg font-bold uppercase tracking-wide text-white @sm:text-xl"
            style={{ fontFamily: 'var(--delivery-font-title)' }}
          >
            {nomeLoja}
          </h1>
        </div>
      </div>
    </header>
  )
}
