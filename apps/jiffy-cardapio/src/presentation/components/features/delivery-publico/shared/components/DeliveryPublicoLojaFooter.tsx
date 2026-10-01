'use client'

import { MapPin } from 'lucide-react'
import type { DeliveryPublicoDesignConfig } from '../types/deliveryPublicoDesignConfig'

const JIFFY_SITE_URL = 'https://jiffy.run/'

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
      className="mt-5 px-4 pt-3 pb-5 text-white"
      style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border-2 border-white/30 bg-white"
          style={{ borderRadius: logoRadius }}
        >
          {config.cabecalho.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-base font-bold" style={{ color: 'var(--delivery-primary)' }}>
              {(nomeLoja[0] ?? '?').toUpperCase()}
            </span>
          )}
        </div>
        <p
          className="text-base font-bold uppercase tracking-wide"
          style={{ fontFamily: 'var(--delivery-font-title)' }}
        >
          {nomeLoja}
        </p>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-bold">Endereço e horários</h3>
        {enderecoTexto ? (
          <p className="mt-1.5 flex items-start gap-2 text-sm leading-snug text-white/90">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{enderecoTexto}</span>
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-white/75">Endereço não informado.</p>
        )}
        <p className="mt-1 pl-6 text-sm leading-snug text-white/85">{horarioTexto}</p>
      </div>

      <p className="mt-4 mb-2 text-center text-xs text-white/70">
        Esta loja online foi criada com{' '}
        <a
          href={JIFFY_SITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold tracking-wide text-white underline-offset-2 hover:underline"
        >
          JIFFY
        </a>
      </p>
    </footer>
  )
}
