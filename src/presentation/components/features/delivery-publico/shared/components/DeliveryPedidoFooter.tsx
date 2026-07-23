'use client'

import { type Ref, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart } from 'lucide-react'
import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'

const MAX_THUMBS = 5
const THUMB_OVERLAP_PX = 12

export type DeliveryCarrinhoThumb = {
  produtoId: string
  imagemUrl: string
  /** Soma das quantidades deste produto no carrinho (linhas deduplicadas). */
  quantidade: number
}

type DeliveryPedidoFooterProps = {
  total: number
  quantidadeItens: number
  interactive?: boolean
  onClick?: () => void
  /** Miniaturas recentes (uma por produto). */
  thumbs?: DeliveryCarrinhoThumb[]
  /** Incrementar para disparar bounce na pilha. */
  thumbsBounceKey?: number
  thumbsTargetRef?: Ref<HTMLDivElement>
}

export function DeliveryPedidoFooter({
  total,
  quantidadeItens,
  interactive = false,
  onClick,
  thumbs = [],
  thumbsBounceKey = 0,
  thumbsTargetRef,
}: DeliveryPedidoFooterProps) {
  const itensLabel = quantidadeItens === 1 ? '1 item' : `${quantidadeItens} itens`
  const visibleThumbs = thumbs.slice(-MAX_THUMBS)
  const [bounce, setBounce] = useState(false)

  useEffect(() => {
    if (!thumbsBounceKey) return
    setBounce(true)
    const timer = window.setTimeout(() => setBounce(false), 200)
    return () => window.clearTimeout(timer)
  }, [thumbsBounceKey])

  const thumbsArea = (
    <div
      ref={thumbsTargetRef}
      className="relative flex h-10 shrink-0 items-center"
      style={{
        width:
          visibleThumbs.length > 0
            ? 40 + (visibleThumbs.length - 1) * (40 - THUMB_OVERLAP_PX)
            : 40,
      }}
      aria-hidden={visibleThumbs.length === 0}
    >
      <motion.div
        className="relative h-10 w-full"
        animate={bounce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {visibleThumbs.map((thumb, index) => (
          <div
            key={thumb.produtoId}
            className="absolute top-0 h-10 w-10"
            style={{
              left: index * (40 - THUMB_OVERLAP_PX),
              zIndex: index + 1,
            }}
          >
            <div className="h-full w-full overflow-hidden rounded-full border-2 border-white bg-neutral-100 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb.imagemUrl} alt="" className="h-full w-full object-cover" />
            </div>
            {thumb.quantidade > 1 ? (
              <span className="absolute -bottom-0.5 -left-0.5 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white shadow-sm">
                {thumb.quantidade > 99 ? '99+' : thumb.quantidade}
              </span>
            ) : null}
          </div>
        ))}
      </motion.div>
    </div>
  )

  const cartButtonClassName =
    'flex h-full w-full items-center justify-center gap-2.5 rounded-none border-0 p-0 text-base font-semibold @sm:text-lg'
  const cartButtonStyle = {
    backgroundColor: 'var(--delivery-primary-dark, #171717)',
    color: 'var(--delivery-btn-text, #ffffff)',
  } as const

  const cartButtonLabel = (
    <>
      <ShoppingCart className="h-5 w-5 shrink-0 @sm:h-6 @sm:w-6" aria-hidden />
      Ver carrinho
    </>
  )

  return (
    <div className="w-full border-t border-neutral-200 bg-white text-neutral-900">
      <p className="px-5 pt-3 pb-2 text-base leading-tight @sm:text-lg">
        <span className="font-semibold">Subtotal:</span>{' '}
        {formatDeliveryCurrency(total)}
        <span className="text-neutral-400"> / {itensLabel}</span>
      </p>

      <div
        className="grid w-full grid-cols-2 items-stretch"
        style={{
          backgroundColor: 'var(--delivery-primary-dark, #171717)',
          color: 'var(--delivery-btn-text, #ffffff)',
          minHeight: '3.5rem',
        }}
      >
        <div className="flex min-h-[3.5rem] min-w-0 items-center px-5 py-2">
          {thumbsArea}
        </div>

        <div className="min-h-[3.5rem]">
          {interactive && onClick ? (
            <button
              type="button"
              onClick={onClick}
              aria-label="Ver carrinho"
              className={cartButtonClassName}
              style={cartButtonStyle}
            >
              {cartButtonLabel}
            </button>
          ) : (
            <div className={cartButtonClassName} style={cartButtonStyle}>
              {cartButtonLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
