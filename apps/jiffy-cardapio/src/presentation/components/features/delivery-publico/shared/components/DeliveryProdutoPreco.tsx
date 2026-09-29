import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'
import type { DeliveryPublicoProdutoViewModel } from '../types/deliveryPublicoViewModel'

function formatDescontoPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  const rounded = Math.round(value * 100) / 100
  const label = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, '')
  return `${label}% OFF`
}

type DeliveryProdutoPrecoProps = {
  produto: Pick<
    DeliveryPublicoProdutoViewModel,
    'preco' | 'precoRegular' | 'descontoPercentual'
  >
  /** Cor do preço vigente (CSS var ou valor). Default: primary do delivery. */
  accentColor?: string
  className?: string
  /** Alinhamento do bloco (lista vs card). */
  align?: 'start' | 'end'
  size?: 'sm' | 'md'
}

/**
 * Preço do produto no cardápio delivery — alinhado ao preview do ERP:
 * normal riscado + badge % | preço vigente.
 */
export function DeliveryProdutoPreco({
  produto,
  accentColor = 'var(--delivery-primary)',
  className = '',
  align = 'start',
  size = 'sm',
}: DeliveryProdutoPrecoProps) {
  const precoRegular = produto.precoRegular
  const mostrarPromo =
    precoRegular != null &&
    Number.isFinite(precoRegular) &&
    precoRegular > produto.preco &&
    produto.preco > 0
  const descontoLabel = mostrarPromo
    ? formatDescontoPct(produto.descontoPercentual)
    : ''
  const precoClass =
    size === 'md' ? 'text-base font-bold @sm:text-lg' : 'text-sm font-semibold @lg:text-base'
  const regularClass = size === 'md' ? 'text-sm' : 'text-xs @lg:text-sm'

  return (
    <div
      className={`mt-0.5 flex flex-col gap-0.5 ${align === 'end' ? 'items-end' : 'items-start'} ${className}`}
      style={{ fontFamily: 'var(--delivery-font-body)' }}
    >
      {mostrarPromo ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`${regularClass} line-through`}
            style={{ color: 'var(--delivery-text-muted, #6b7280)' }}
          >
            {formatDeliveryCurrency(precoRegular)}
          </span>
          {descontoLabel ? (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white @lg:text-xs bg-emerald-600">
              {descontoLabel}
            </span>
          ) : null}
        </div>
      ) : null}
      <span className={precoClass} style={{ color: accentColor }}>
        {formatDeliveryCurrency(produto.preco)}
      </span>
    </div>
  )
}
