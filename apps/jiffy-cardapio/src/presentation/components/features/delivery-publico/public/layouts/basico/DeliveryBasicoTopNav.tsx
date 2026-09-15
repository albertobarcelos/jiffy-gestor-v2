'use client'

import { Menu, ShoppingCart } from 'lucide-react'
import { DeliveryStatusHorario } from '../../../shared/components/DeliveryStatusHorario'
import type { DeliveryPublicoDesignConfig } from '../../../shared/types/deliveryPublicoDesignConfig'

type DeliveryBasicoTopNavProps = {
  config: DeliveryPublicoDesignConfig
  carrinhoQuantidade: number
  disponivel: boolean
  statusMensagem: string
  statusDetalheHorario?: string | null
  interactive?: boolean
  onPedidoClick?: () => void
  onInformacoesClick?: () => void
}

/** Topnav da loja — logo, nome, status/horários e ações. */
export function DeliveryBasicoTopNav({
  config,
  carrinhoQuantidade,
  disponivel,
  statusMensagem,
  statusDetalheHorario = null,
  interactive = false,
  onPedidoClick,
  onInformacoesClick,
}: DeliveryBasicoTopNavProps) {
  const nomeLoja = config.cabecalho.nomeExibicao.trim() || 'Sua loja'
  const logoRadius = config.cabecalho.logoFormato === 'circular' ? '9999px' : '8px'

  return (
    <header
      className="delivery-basico-topnav relative z-10 flex items-center gap-2 px-3 py-2.5 @sm:gap-2.5 @sm:px-4 @sm:py-3"
      style={{
        backgroundColor: 'var(--delivery-primary-dark, #171717)',
        color: 'var(--delivery-btn-text, #ffffff)',
      }}
    >
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden bg-white @sm:h-16 @sm:w-16"
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

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0 leading-none">
        <h1
          className="truncate text-sm font-semibold leading-tight tracking-wide @sm:text-base"
          style={{ fontFamily: 'var(--delivery-font-title)' }}
        >
          {nomeLoja}
        </h1>

        <DeliveryStatusHorario
          variant="topnav"
          disponivel={disponivel}
          statusMensagem={statusMensagem}
          statusDetalheHorario={statusDetalheHorario}
          interactive={interactive}
          onInformacoesClick={onInformacoesClick}
        />
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          aria-label="Ver carrinho"
          disabled={!interactive}
          onClick={() => interactive && onPedidoClick?.()}
          className="relative flex h-10 w-10 items-center justify-center rounded-full disabled:cursor-default @sm:h-11 @sm:w-11"
          style={{ color: 'var(--delivery-btn-text, #ffffff)' }}
        >
          <ShoppingCart className="h-5 w-5 @sm:h-6 @sm:w-6" aria-hidden />
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
          className="flex h-10 w-10 items-center justify-center rounded-full disabled:cursor-default @sm:h-11 @sm:w-11"
          style={{ color: 'var(--delivery-btn-text, #ffffff)' }}
        >
          <Menu className="h-5 w-5 @sm:h-6 @sm:w-6" aria-hidden />
        </button>
      </div>
    </header>
  )
}
