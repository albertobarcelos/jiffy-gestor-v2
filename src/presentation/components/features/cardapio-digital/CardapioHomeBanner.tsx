'use client'

import { cn } from '@/src/shared/utils/cn'

interface CardapioHomeBannerProps {
  bannerUrl?: string | null
  className?: string
}

/**
 * Banner promocional do cardápio público (home e catálogo).
 * Exibido apenas em telas mobile; usa imagem da empresa ou placeholder.
 */
export function CardapioHomeBanner({ bannerUrl, className }: CardapioHomeBannerProps) {
  const url = bannerUrl?.trim()

  if (url) {
    return (
      <div
        className={cn(
          'w-full flex-shrink-0 overflow-hidden min-h-[9rem] sm:min-h-[10rem] lg:min-h-[11rem]',
          className
        )}
        role="img"
        aria-label="Banner promocional"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Banner promocional"
          className="w-full h-36 sm:h-40 lg:h-44 object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-full flex-shrink-0 flex items-center justify-center border-b border-dashed',
        'h-36 sm:h-40 lg:h-44 min-h-[9rem] sm:min-h-[10rem] lg:min-h-[11rem]',
        className
      )}
      style={{
        backgroundColor: 'var(--cardapio-bg-elevated)',
        borderColor: 'var(--cardapio-border)',
      }}
      role="img"
      aria-label="Espaço reservado para banner promocional"
    >
      <span
        className="text-sm font-semibold uppercase tracking-widest select-none"
        style={{ color: 'var(--cardapio-surface-muted)' }}
      >
        Banner
      </span>
    </div>
  )
}
