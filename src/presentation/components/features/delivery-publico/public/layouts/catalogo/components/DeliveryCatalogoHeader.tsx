'use client'

import { ShoppingCart } from 'lucide-react'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryCatalogoHeaderProps = {
  config: DeliveryPublicoDesignConfig
  carrinhoQuantidade: number
  interactive?: boolean
  onPedidoClick?: () => void
}

export function DeliveryCatalogoHeader({
  config,
  carrinhoQuantidade,
  interactive = false,
  onPedidoClick,
}: DeliveryCatalogoHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '10px'
  const capaUrl = config.cabecalho.capaUrl

  return (
    <header>
      <div
        className="delivery-loja-capa delivery-catalogo-capa relative w-full overflow-hidden"
        style={{ backgroundColor: 'var(--delivery-primary-dark)' }}
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
          <div className="delivery-catalogo-capa-placeholder w-full" aria-hidden />
        )}
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border shadow-sm"
          style={{
            borderRadius: logoRadius,
            borderColor: 'var(--delivery-card-border)',
            backgroundColor: 'var(--delivery-surface)',
          }}
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

        <div className="min-w-0 flex-1">
          <h1
            className="truncate text-base font-bold @sm:text-lg"
            style={{
              color: 'var(--delivery-primary)',
              fontFamily: 'var(--delivery-font-title)',
            }}
          >
            {nomeLoja}
          </h1>
        </div>

        <button
          type="button"
          aria-label="Ver carrinho"
          disabled={!interactive}
          onClick={() => interactive && onPedidoClick?.()}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border disabled:cursor-default"
          style={{
            borderColor: 'var(--delivery-card-border)',
            color: 'var(--delivery-primary)',
            backgroundColor: 'var(--delivery-surface)',
          }}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {carrinhoQuantidade > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
              {carrinhoQuantidade > 99 ? '99+' : carrinhoQuantidade}
            </span>
          ) : null}
        </button>
      </div>
    </header>
  )
}
