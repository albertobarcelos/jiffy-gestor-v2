'use client'

import { type Ref, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatDeliveryCurrency } from '../utils/formatDeliveryCurrency'

const MAX_THUMBS = 5
const THUMB_OVERLAP_PX = 12

export type DeliveryCarrinhoThumb = {
  produtoId: string
  imagemUrl: string
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
            className="absolute top-0 h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-neutral-100 shadow-sm"
            style={{
              left: index * (40 - THUMB_OVERLAP_PX),
              zIndex: index + 1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb.imagemUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </motion.div>
    </div>
  )

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        {thumbsArea}
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left font-normal">
          <span className="text-sm leading-tight text-neutral-900">Subtotal</span>
          <span className="text-sm leading-tight text-neutral-900">
            {formatDeliveryCurrency(total)}
            <span className="text-neutral-400"> / {itensLabel}</span>
          </span>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-black px-5 py-2.5 text-sm font-normal text-white">
        Ver carrinho
      </span>
    </>
  )

  const barClassName =
    'flex w-full items-center justify-between gap-3 border-t border-neutral-200 bg-white px-5 py-3 text-neutral-900'

  if (interactive && onClick) {
    return (
      <button type="button" onClick={onClick} aria-label="Ver carrinho" className={barClassName}>
        {content}
      </button>
    )
  }

  return <div className={barClassName}>{content}</div>
}
