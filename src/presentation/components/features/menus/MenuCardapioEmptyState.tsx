'use client'

import Image from 'next/image'
import { MenuCardapioAcoes } from './MenuCardapioAcoes'

interface MenuCardapioEmptyStateProps {
  onAdicionar: () => void
  adicionarLabel?: string
  imageAlt?: string
}

export function MenuCardapioEmptyState({
  onAdicionar,
  adicionarLabel,
  imageAlt = 'Este cardápio ainda não tem produtos',
}: MenuCardapioEmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-4 pt-6 md:pt-8">
      <div className="relative h-40 w-40 md:h-52 md:w-52">
        <Image
          src="/images/jiffy-acenando.png"
          alt={imageAlt}
          fill
          sizes="208px"
          className="object-contain"
          priority
        />
      </div>
      <MenuCardapioAcoes
        onAdicionar={onAdicionar}
        adicionarLabel={adicionarLabel}
        className="mt-6 justify-center"
      />
    </div>
  )
}
