'use client'

import { ChevronRight, ShoppingCart, User } from 'lucide-react'
import type { DeliveryPublicoDesignConfig } from '../../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryCatalogoHeaderProps = {
  config: DeliveryPublicoDesignConfig
  disponivel: boolean
  carrinhoQuantidade: number
  interactive?: boolean
  onPedidoClick?: () => void
}

export function DeliveryCatalogoHeader({
  config,
  disponivel,
  carrinhoQuantidade,
  interactive = false,
  onPedidoClick,
}: DeliveryCatalogoHeaderProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '10px'

  return (
    <header>
      <div
        className="h-36 bg-cover bg-center @sm:h-40"
        style={{
          backgroundColor: 'var(--delivery-hero-bg)',
          backgroundImage: config.cabecalho.capaUrl ? `url(${config.cabecalho.capaUrl})` : undefined,
        }}
      />

      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border border-gray-100 bg-white shadow-sm"
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

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1 text-left"
        >
          <span
            className="truncate text-base font-bold @sm:text-lg"
            style={{
              color: 'var(--delivery-primary)',
              fontFamily: 'var(--delivery-font-title)',
            }}
          >
            {nomeLoja}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
        </button>

        <span
          className={`hidden shrink-0 rounded-md px-2 py-1 text-xs font-semibold @sm:inline-flex ${
            disponivel ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          {disponivel ? 'Disponível' : 'Indisponível'}
        </span>

        <button
          type="button"
          aria-label="Ver carrinho"
          disabled={!interactive}
          onClick={() => interactive && onPedidoClick?.()}
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border disabled:cursor-default"
          style={{
            borderColor: 'var(--delivery-card-border)',
            color: 'var(--delivery-primary)',
          }}
        >
          <ShoppingCart className="h-5 w-5" aria-hidden />
          {carrinhoQuantidade > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
              {carrinhoQuantidade > 99 ? '99+' : carrinhoQuantidade}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          aria-label="Perfil"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: 'var(--delivery-card-border)',
            color: 'var(--delivery-primary)',
          }}
        >
          <User className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </header>
  )
}
