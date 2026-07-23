'use client'

import { useEffect, useRef, type RefObject } from 'react'
import { Menu, ShoppingCart } from 'lucide-react'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryBasicoTopNavProps = {
  config: DeliveryPublicoDesignConfig
  carrinhoQuantidade: number
  interactive?: boolean
  catalogRootRef: RefObject<HTMLDivElement | null>
  onPedidoClick?: () => void
}

export function DeliveryBasicoTopNav({
  config,
  carrinhoQuantidade,
  interactive = false,
  catalogRootRef,
  onPedidoClick,
}: DeliveryBasicoTopNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '8px'

  useEffect(() => {
    const nav = navRef.current
    const root = catalogRootRef.current
    if (!nav || !root) return

    const syncHeight = () => {
      root.style.setProperty('--delivery-basico-topnav-h', `${Math.round(nav.offsetHeight)}px`)
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(nav)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--delivery-basico-topnav-h')
    }
  }, [catalogRootRef])

  return (
    <header
      ref={navRef}
      className="delivery-basico-topnav sticky top-0 z-50 flex items-center gap-3 px-3 py-3.5 @sm:px-4 @sm:py-4"
      style={{
        backgroundColor: 'var(--delivery-primary-dark, #171717)',
        color: 'var(--delivery-btn-text, #ffffff)',
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden bg-white @sm:h-14 @sm:w-14"
        style={{ borderRadius: logoRadius }}
      >
        {config.cabecalho.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={config.cabecalho.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span
            className="text-base font-bold @sm:text-lg"
            style={{ color: 'var(--delivery-primary-dark, #171717)' }}
          >
            {(nomeLoja[0] ?? '?').toUpperCase()}
          </span>
        )}
      </div>

      <h1
        className="min-w-0 flex-1 truncate text-base font-semibold tracking-wide @sm:text-lg"
        style={{ fontFamily: 'var(--delivery-font-title)' }}
      >
        {nomeLoja}
      </h1>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label="Ver carrinho"
          disabled={!interactive}
          onClick={() => interactive && onPedidoClick?.()}
          className="relative flex h-11 w-11 items-center justify-center rounded-full disabled:cursor-default"
          style={{ color: 'var(--delivery-btn-text, #ffffff)' }}
        >
          <ShoppingCart className="h-6 w-6" aria-hidden />
          {carrinhoQuantidade > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
              {carrinhoQuantidade > 99 ? '99+' : carrinhoQuantidade}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          aria-label="Menu"
          disabled={!interactive}
          className="flex h-11 w-11 items-center justify-center rounded-full disabled:cursor-default"
          style={{ color: 'var(--delivery-btn-text, #ffffff)' }}
        >
          <Menu className="h-6 w-6" aria-hidden />
        </button>
      </div>
    </header>
  )
}
