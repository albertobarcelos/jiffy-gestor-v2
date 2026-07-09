'use client'

import { ChevronDown, User } from 'lucide-react'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryVitrineHeaderProps = {
  config: DeliveryPublicoDesignConfig
  disponivel: boolean
  tipoEntrega: 'entrega' | 'retirada'
  interactive?: boolean
  onTipoEntregaChange?: (tipo: 'entrega' | 'retirada') => void
}

export function DeliveryVitrineHeader({
  config,
  disponivel,
  tipoEntrega,
  interactive = false,
  onTipoEntregaChange,
}: DeliveryVitrineHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '12px'
  const tipoLabel = tipoEntrega === 'entrega' ? 'Delivery' : 'Para retirar'

  const handleTipoClick = () => {
    if (!interactive || !onTipoEntregaChange) return
    onTipoEntregaChange(tipoEntrega === 'entrega' ? 'retirada' : 'entrega')
  }

  return (
    <header className="relative">
      <div
        className="relative h-44 bg-cover bg-center @sm:h-48 @lg:h-52"
        style={{
          backgroundColor: 'var(--delivery-hero-bg)',
          backgroundImage: config.cabecalho.capaUrl ? `url(${config.cabecalho.capaUrl})` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/55" />

        <div className="absolute left-3 top-3 z-10 @sm:left-4 @sm:top-4">
          <div
            className="flex h-14 w-14 items-center justify-center overflow-hidden border-2 border-white bg-white shadow-md @sm:h-16 @sm:w-16"
            style={{ borderRadius: logoRadius }}
          >
            {config.cabecalho.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className="text-xl font-bold @sm:text-2xl"
                style={{ color: 'var(--delivery-primary)' }}
              >
                {(nomeLoja[0] ?? '?').toUpperCase()}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          aria-label="Perfil"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/20 text-white backdrop-blur-sm @sm:right-4 @sm:top-4"
        >
          <User className="h-5 w-5" aria-hidden />
        </button>

        <div className="absolute inset-x-0 bottom-14 px-4 @sm:bottom-16">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="truncate text-lg font-bold uppercase tracking-wide text-white @sm:text-xl"
                style={{ fontFamily: 'var(--delivery-font-title)' }}
              >
                {nomeLoja}
              </h1>
              <button
                type="button"
                className="mt-0.5 text-xs font-medium text-white/90 underline-offset-2 hover:underline"
              >
                Ver mais
              </button>
            </div>
            <span
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold ${
                disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {disponivel ? 'Disponível' : 'Indisponível'}
            </span>
          </div>
        </div>

        <div className="absolute inset-x-4 bottom-3 @sm:bottom-4">
          <button
            type="button"
            disabled={!interactive}
            onClick={handleTipoClick}
            className="flex w-full items-center justify-between rounded-xl border border-white/40 bg-black/35 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm disabled:cursor-default"
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>🛵</span>
              {tipoLabel}
            </span>
            <ChevronDown className="h-4 w-4 opacity-90" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  )
}
