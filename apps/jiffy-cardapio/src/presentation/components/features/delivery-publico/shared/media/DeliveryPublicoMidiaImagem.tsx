'use client'

import Image from 'next/image'
import { deveUsarOtimizadorImagem } from './deliveryPublicoImageHosts'

type DeliveryPublicoMidiaImagemProps = {
  src: string
  sizes: string
  className?: string
  alt?: string
  priority?: boolean
  produtoId?: string
}

/**
 * Foto de catálogo/capa/logo: recorte mobile via `sizes`.
 * Host desconhecido não passa pelo otimizador (evita quebrar 200 lojas com CDN próprio).
 */
export function DeliveryPublicoMidiaImagem({
  src,
  sizes,
  className,
  alt = '',
  priority = false,
  produtoId,
}: DeliveryPublicoMidiaImagemProps) {
  const trimmed = src.trim()
  if (!trimmed) return null

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      unoptimized={!deveUsarOtimizadorImagem(trimmed)}
      className={className}
      data-delivery-produto-img={produtoId}
    />
  )
}
