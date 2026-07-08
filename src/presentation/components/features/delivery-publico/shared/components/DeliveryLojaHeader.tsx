'use client'

import type { DeliveryPublicoDesignConfig } from '../../shared/types/deliveryPublicoDesignConfig'

type DeliveryLojaHeaderProps = {
  config: DeliveryPublicoDesignConfig
  onVerMaisClick?: () => void
}

export function DeliveryLojaHeader({ config, onVerMaisClick }: DeliveryLojaHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '8px'

  return (
    <>
      <div
        className="h-28 bg-cover bg-center sm:h-36"
        style={{
          backgroundColor: 'var(--delivery-hero-bg)',
          backgroundImage: config.cabecalho.capaUrl ? `url(${config.cabecalho.capaUrl})` : undefined,
        }}
      />
      <div className="px-4 pb-2">
        <div className="-mt-8 flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1
              className="truncate text-xl font-bold sm:text-2xl"
              style={{
                color: 'var(--delivery-text)',
                fontFamily: 'var(--delivery-font-title)',
              }}
            >
              {nomeLoja}
            </h1>
            {onVerMaisClick ? (
              <button
                type="button"
                onClick={onVerMaisClick}
                className="text-xs text-gray-500 underline"
              >
                Ver mais
              </button>
            ) : (
              <span className="text-xs text-gray-500 underline">Ver mais</span>
            )}
          </div>
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border-2 border-white bg-gray-100 sm:h-16 sm:w-16"
            style={{ borderRadius: logoRadius }}
          >
            {config.cabecalho.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className="text-xl font-bold"
                style={{ color: 'var(--delivery-primary)' }}
              >
                {(nomeLoja[0] ?? '?').toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
