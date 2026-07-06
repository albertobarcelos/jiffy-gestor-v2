'use client'

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '@/src/shared/utils/cn'

/** Gradientes padrão do card de destaque (Meus Apps e carrosséis informativos). */
export const GRADIENT_CAROUSEL_GRADIENTS = [
  'from-sky-500 to-blue-700',
  'from-cyan-500 to-teal-700',
  'from-indigo-600 to-violet-800',
] as const

export type GradientCarouselSlide = {
  id: string
  /** Classes Tailwind em `bg-gradient-to-br` (ex.: `from-sky-500 to-blue-700`). */
  gradientClassName?: string
  /** Gradiente CSS inline (tem prioridade sobre `gradientClassName`). */
  gradientStyle?: CSSProperties['background']
  /** Rótulo superior pequeno (ex.: “Destaque”). */
  badge?: string
  /** Título principal do slide. */
  titulo?: string
  /** Conteúdo livre abaixo do título. */
  content?: ReactNode
}

type GradientCarouselCardProps = {
  slides: GradientCarouselSlide[]
  intervalMs?: number
  className?: string
  heightClassName?: string
  ariaLabel: string
  badgeClassName?: string
  titleClassName?: string
  contentClassName?: string
}

const DEFAULT_INTERVAL_MS = 4000

/**
 * Card com carrossel simples: troca automática, indicadores e gradiente por slide.
 * Usado em Meus Apps (destaques) e Perfil (resumos laterais).
 */
export function GradientCarouselCard({
  slides,
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
  heightClassName = 'h-52',
  ariaLabel,
  badgeClassName,
  titleClassName,
  contentClassName,
}: GradientCarouselCardProps) {
  const [indice, setIndice] = useState(0)
  const total = slides.length
  const slide = slides[indice]

  const avancar = useCallback(() => {
    if (total <= 1) return
    setIndice(i => (i + 1) % total)
  }, [total])

  const irPara = useCallback((i: number) => {
    setIndice(i)
  }, [])

  useEffect(() => {
    if (total <= 1) return
    const t = window.setInterval(avancar, intervalMs)
    return () => window.clearInterval(t)
  }, [avancar, intervalMs, total])

  if (!slide) return null

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border border-gray-200 shadow-sm',
        heightClassName,
        className
      )}
      role="region"
      aria-roledescription="carrossel"
      aria-label={ariaLabel}
    >
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col px-4 pt-3 pb-1 text-white',
          slide.gradientStyle ? undefined : 'bg-gradient-to-br',
          slide.gradientClassName
        )}
        style={slide.gradientStyle ? { background: slide.gradientStyle } : undefined}
      >
        {slide.badge ? (
          <p
            className={cn(
              'shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85',
              badgeClassName
            )}
          >
            {slide.badge}
          </p>
        ) : null}

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col justify-center py-2',
            slide.badge ? 'pt-1' : 'pt-2',
            contentClassName
          )}
        >
          {slide.titulo ? (
            <h3
              className={cn(
                'font-exo text-center text-lg font-bold leading-snug text-white drop-shadow-sm',
                titleClassName
              )}
            >
              {slide.titulo}
            </h3>
          ) : null}
          {slide.content ? (
            <div className={cn(slide.titulo ? 'mt-3' : undefined)}>{slide.content}</div>
          ) : null}
        </div>

        {total > 1 ? (
          <div
            className="flex shrink-0 items-center justify-center gap-1.5 pb-2 pt-0.5"
            role="tablist"
            aria-label="Slide"
          >
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === indice}
                onClick={() => irPara(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === indice ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'
                )}
                title={`Slide ${i + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
