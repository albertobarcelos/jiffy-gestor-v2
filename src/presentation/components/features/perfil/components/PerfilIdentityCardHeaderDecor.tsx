'use client'

import Image from 'next/image'
import { cn } from '@/src/shared/utils/cn'

const FUNDO_HEADER_PERFIL_SRC = '/images/fundo-header-perfil.png'

type PerfilIdentityCardHeaderImageProps = {
  className?: string
}

/**
 * Imagem decorativa do card de perfil (lado esquerdo do header).
 * Arquivo esperado em `public/images/fundo-header-perfil.png`.
 */
export function PerfilIdentityCardHeaderImage({ className }: PerfilIdentityCardHeaderImageProps) {
  return (
    <div
      className={cn(
        'relative h-28 shrink-0 overflow-hidden bg-white sm:h-32',
        className
      )}
      aria-hidden
    >
      <Image
        src={FUNDO_HEADER_PERFIL_SRC}
        alt=""
        width={520}
        height={128}
        className="h-full w-auto object-cover object-left"
        priority
      />
    </div>
  )
}
