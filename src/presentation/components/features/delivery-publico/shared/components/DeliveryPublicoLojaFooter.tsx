'use client'

import { MapPin } from 'lucide-react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

type DeliveryPublicoLojaFooterProps = {
  config: DeliveryPublicoDesignConfig
  enderecoTexto?: string | null
  horarioTexto: string
}

export function DeliveryPublicoLojaFooter({
  config,
  enderecoTexto,
  horarioTexto,
}: DeliveryPublicoLojaFooterProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '12px'

  return (
    <footer
      className="px-4 py-8 text-white"
      style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border-2 border-white/30 bg-white"
          style={{ borderRadius: logoRadius }}
        >
          {config.cabecalho.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-lg font-bold" style={{ color: 'var(--delivery-primary)' }}>
              {(nomeLoja[0] ?? '?').toUpperCase()}
            </span>
          )}
        </div>
        <p
          className="text-lg font-bold uppercase tracking-wide"
          style={{ fontFamily: 'var(--delivery-font-title)' }}
        >
          {nomeLoja}
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-base font-bold">Endereço e horários</h3>
        {enderecoTexto ? (
          <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-white/90">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{enderecoTexto}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/75">Endereço não informado.</p>
        )}
        <p className="mt-2 text-sm text-white/85">{horarioTexto}</p>
      </div>

      <p className="mt-8 text-center text-xs text-white/70">
        Esta loja online foi criada com{' '}
        <span className="font-bold tracking-wide text-white">JIFFY</span>
      </p>
    </footer>
  )
}
