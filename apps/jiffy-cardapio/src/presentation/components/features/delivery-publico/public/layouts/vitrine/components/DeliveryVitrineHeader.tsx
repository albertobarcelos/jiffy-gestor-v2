'use client'

import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'
import { DeliveryPublicoMidiaImagem } from '../../../../shared/media/DeliveryPublicoMidiaImagem'
import { DELIVERY_IMAGEM_SIZES } from '../../../../shared/media/deliveryPublicoImageHosts'

type DeliveryVitrineHeaderProps = {
  config: DeliveryPublicoDesignConfig
  disponivel: boolean
  /** Horário complementar do dia (ex.: "até as 22:45"), igual ao Básico. */
  statusDetalheHorario?: string | null
  interactive?: boolean
  onInformacoesClick?: () => void
}

export function DeliveryVitrineHeader({
  config,
  disponivel,
  statusDetalheHorario = null,
  interactive = false,
  onInformacoesClick,
}: DeliveryVitrineHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '12px'

  return (
    <header className="relative">
      <div
        className="relative h-44 overflow-hidden @sm:h-48 @lg:h-52"
        style={{ backgroundColor: 'var(--delivery-hero-bg)' }}
      >
        {config.cabecalho.capaUrl ? (
          <DeliveryPublicoMidiaImagem
            src={config.cabecalho.capaUrl}
            sizes={DELIVERY_IMAGEM_SIZES.capa}
            priority
            className="object-cover object-center"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/55" />

        <div className="absolute left-3 top-3 z-10 @sm:left-4 @sm:top-4">
          <div
            className="relative flex h-14 w-14 items-center justify-center overflow-hidden border-2 border-white bg-white shadow-md @sm:h-16 @sm:w-16"
            style={{ borderRadius: logoRadius }}
          >
            {config.cabecalho.logoUrl ? (
              <DeliveryPublicoMidiaImagem
                src={config.cabecalho.logoUrl}
                sizes={DELIVERY_IMAGEM_SIZES.logo}
                className="object-cover"
              />
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

        <div className="absolute inset-x-0 bottom-4 px-4 @sm:bottom-5">
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
                disabled={!interactive}
                onClick={() => interactive && onInformacoesClick?.()}
                className="mt-0.5 text-xs font-medium text-white/90 underline-offset-2 hover:underline disabled:cursor-default disabled:no-underline"
              >
                Ver mais
              </button>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
                  disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {disponivel ? 'Aberto' : 'Fechado'}
              </span>
              {statusDetalheHorario?.trim() ? (
                <span className="max-w-[9.5rem] text-right text-[10px] font-medium leading-tight text-white/90 @sm:text-[11px]">
                  {statusDetalheHorario.trim()}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
