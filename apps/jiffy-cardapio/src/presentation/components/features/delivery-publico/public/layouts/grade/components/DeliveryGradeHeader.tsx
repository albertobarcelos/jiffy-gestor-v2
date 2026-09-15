'use client'

import { Info, User } from 'lucide-react'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryGradeHeaderProps = {
  config: DeliveryPublicoDesignConfig
  disponivel: boolean
}

export function DeliveryGradeHeader({ config, disponivel }: DeliveryGradeHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '12px'

  return (
    <header className="relative px-4 pt-3">
      <div
        className="relative overflow-hidden rounded-b-[2rem] bg-cover bg-center @sm:rounded-b-[2.25rem]"
        style={{
          backgroundColor: 'var(--delivery-hero-bg)',
          backgroundImage: config.cabecalho.capaUrl ? `url(${config.cabecalho.capaUrl})` : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/50" />

        <div className="relative flex items-start justify-between px-4 pb-6 pt-4">
          <button
            type="button"
            aria-label="Informações"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-black/20 text-white backdrop-blur-sm"
          >
            <Info className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Perfil"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/50 bg-black/20 text-white backdrop-blur-sm"
          >
            <User className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="relative flex flex-col items-center px-4 pb-8 pt-2 text-center">
          <div
            className="mb-3 flex h-14 w-14 items-center justify-center overflow-hidden border-2 border-white bg-white shadow-md"
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
            className="text-lg font-bold uppercase tracking-wide text-white @sm:text-xl"
            style={{ fontFamily: 'var(--delivery-font-title)' }}
          >
            {nomeLoja}
          </h1>
          <span
            className={`mt-2 rounded-md px-2.5 py-1 text-xs font-semibold ${
              disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {disponivel ? 'Disponível' : 'Indisponível'}
          </span>
        </div>
      </div>
    </header>
  )
}
