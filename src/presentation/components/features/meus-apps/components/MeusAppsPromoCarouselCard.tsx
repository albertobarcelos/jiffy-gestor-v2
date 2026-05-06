'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/src/shared/utils/cn'

/** Slides locais (placeholder); depois pode vir de CMS/API). */
const SLIDES = [
  {
    id: '1',
    titulo: 'Tudo em um só lugar',
    descricao:
      'Organize vendas, financeiro e cadastros sem ficar alternando entre vários sistemas. Veja indicadores e rotinas no mesmo painel e decida com informação sempre atualizada.',
    gradient: 'from-sky-500 to-blue-700',
  },
  {
    id: '2',
    titulo: 'Aprenda com quem entende',
    descricao:
      'Use tutoriais, treinamentos e o suporte quando precisar. Tire dúvidas e evolua sua operação no seu ritmo, sem depender só de tentativa e erro.',
    gradient: 'from-cyan-500 to-teal-700',
  },
  {
    id: '3',
    titulo: 'Conecte todo o fluxo',
    descricao:
      'Integre PDV, delivery, emissão fiscal e outros pontos do dia a dia. Menos digitação duplicada, menos erro manual e mais tempo para atender bem o cliente.',
    gradient: 'from-indigo-600 to-violet-800',
  },
]

/** Tempo entre uma propaganda e outra (troca automática). */
const INTERVAL_MS = 4000

/**
 * Card promocional no grid “Meus aplicativos”: mesma altura dos cards de empresa/convite (`h-52`).
 * Carrossel simples com indicadores; não substitui item real do feed.
 */
export function MeusAppsPromoCarouselCard({ className }: { className?: string }) {
  const [indice, setIndice] = useState(0)
  const total = SLIDES.length
  const slide = SLIDES[indice]!

  const avancar = useCallback(() => {
    setIndice(i => (i + 1) % total)
  }, [total])

  const irPara = useCallback((i: number) => {
    setIndice(i)
  }, [])

  useEffect(() => {
    const t = window.setInterval(avancar, INTERVAL_MS)
    return () => window.clearInterval(t)
  }, [avancar])

  return (
    <div
      className={cn(
        'flex h-52 flex-col overflow-hidden rounded-2xl border border-gray-200 shadow-sm',
        className
      )}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Destaques e ofertas"
    >
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col bg-gradient-to-br px-3 pt-2.5 pb-1 text-white',
          slide.gradient
        )}
      >
        <p className="shrink-0 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white/85">
          Destaque
        </p>

        <div className="flex min-h-0 flex-1 flex-col justify-center px-0.5 py-1">
          <h3 className="font-exo text-center text-lg font-bold leading-snug text-white drop-shadow-sm sm:text-xl">
            {slide.titulo}
          </h3>
          <p className="mt-2 line-clamp-5 text-center text-[11px] leading-relaxed text-white/95 sm:text-xs">
            {slide.descricao}
          </p>
        </div>

        <div
          className="flex shrink-0 items-center justify-center gap-1.5 pb-2 pt-0.5"
          role="tablist"
          aria-label="Slide"
        >
          {SLIDES.map((s, i) => (
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
      </div>
    </div>
  )
}
