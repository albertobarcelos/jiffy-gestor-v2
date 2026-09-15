'use client'

import { Menu, Search, ShoppingCart } from 'lucide-react'

type DeliveryGradeToolbarProps = {
  termoBusca: string
  carrinhoQuantidade: number
  interactive?: boolean
  onBuscaChange?: (termo: string) => void
  onPedidoClick?: () => void
  onMenuClick?: () => void
}

export function DeliveryGradeToolbar({
  termoBusca,
  carrinhoQuantidade,
  interactive = false,
  onBuscaChange,
  onPedidoClick,
  onMenuClick,
}: DeliveryGradeToolbarProps) {
  return (
    <div className="mt-3 flex items-center gap-2 px-4">
      <label className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: 'var(--delivery-text-muted)' }}
          aria-hidden
        />
        <input
          type="search"
          value={termoBusca}
          readOnly={!interactive}
          onChange={e => interactive && onBuscaChange?.(e.target.value)}
          placeholder="Pesquisar por produtos"
          className="w-full rounded-xl border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[color-mix(in_srgb,var(--delivery-primary)_35%,transparent)]"
          style={{
            borderColor: 'var(--delivery-card-border)',
            color: 'var(--delivery-text)',
            fontFamily: 'var(--delivery-font-body)',
            backgroundColor: 'var(--delivery-surface)',
          }}
        />
      </label>

      <button
        type="button"
        aria-label="Ver carrinho"
        disabled={!interactive}
        onClick={() => interactive && onPedidoClick?.()}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white disabled:cursor-default"
        style={{ backgroundColor: 'var(--delivery-primary)' }}
      >
        <ShoppingCart className="h-5 w-5" aria-hidden />
        {carrinhoQuantidade > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {carrinhoQuantidade > 99 ? '99+' : carrinhoQuantidade}
          </span>
        ) : null}
      </button>

      <button
        type="button"
        aria-label="Menu de categorias"
        disabled={!interactive}
        onClick={() => interactive && onMenuClick?.()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border disabled:cursor-default"
        style={{
          borderColor: 'var(--delivery-card-border)',
          backgroundColor: 'var(--delivery-surface)',
          color: 'var(--delivery-text)',
        }}
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
    </div>
  )
}
