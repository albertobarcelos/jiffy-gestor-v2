'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import {
  PROMOCOES_MOCK_CARDAPIO_MESA,
  type BannerPromocao,
} from './bannerPromocoes'

type Props = {
  promocoes?: BannerPromocao[]
}

/**
 * Carrossel horizontal de promoções (mobile) — abaixo da barra de categorias.
 */
export default function BannerPromocoesHorizontal({ promocoes = [] }: Props) {
  const slides = promocoes.length > 0 ? promocoes : PROMOCOES_MOCK_CARDAPIO_MESA
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentXRef = useRef(0)

  useEffect(() => {
    if (paused || dragging || slides.length <= 1) return
    const id = window.setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [paused, dragging, slides.length])

  const finishDrag = (endX: number) => {
    const el = containerRef.current
    if (!el) {
      setDragging(false)
      setDragOffset(0)
      setPaused(false)
      return
    }
    const threshold = el.offsetWidth * 0.2
    const diff = endX - startX
    if (Math.abs(diff) > threshold) {
      if (diff < 0 && currentIndex < slides.length - 1) setCurrentIndex(currentIndex + 1)
      else if (diff > 0 && currentIndex > 0) setCurrentIndex(currentIndex - 1)
    }
    setDragging(false)
    setDragOffset(0)
    window.setTimeout(() => setPaused(false), 3000)
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const el = containerRef.current
      if (!el) return
      currentXRef.current = e.pageX
      setDragOffset(((e.pageX - startX) / el.offsetWidth) * 100)
    }
    const onUp = () => finishDrag(currentXRef.current)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, startX, currentIndex, slides.length])

  if (slides.length === 0) return null

  const itemWidthPercent = 100 / slides.length
  const transform = Math.max(
    0,
    Math.min(currentIndex * itemWidthPercent - dragOffset, (slides.length - 1) * itemWidthPercent)
  )

  return (
    <div
      ref={containerRef}
      className="relative h-28 w-full cursor-grab overflow-hidden rounded-xl active:cursor-grabbing sm:h-32"
      style={{ backgroundColor: 'var(--cardapio-bg-elevated)', userSelect: 'none' }}
      onMouseEnter={() => {
        if (!dragging) setPaused(true)
      }}
      onMouseLeave={() => {
        if (!dragging) setPaused(false)
      }}
      onMouseDown={e => {
        if ((e.target as HTMLElement).tagName === 'IMG') e.preventDefault()
        setDragging(true)
        setPaused(true)
        setStartX(e.pageX)
        currentXRef.current = e.pageX
        setDragOffset(0)
      }}
      onTouchStart={e => {
        setDragging(true)
        setPaused(true)
        setStartX(e.touches[0].clientX)
        currentXRef.current = e.touches[0].clientX
        setDragOffset(0)
      }}
      onTouchMove={e => {
        const el = containerRef.current
        if (!dragging || !el) return
        currentXRef.current = e.touches[0].clientX
        setDragOffset(((e.touches[0].clientX - startX) / el.offsetWidth) * 100)
      }}
      onTouchEnd={() => finishDrag(currentXRef.current)}
    >
      <div
        className="flex h-full"
        style={{
          transform: `translateX(-${transform}%)`,
          width: `${slides.length * 100}%`,
          transition: dragging ? 'none' : 'transform 0.5s ease-in-out',
        }}
      >
        {slides.map(promo => (
          <div
            key={promo.id}
            className="relative h-full shrink-0"
            style={{ width: `${100 / slides.length}%` }}
          >
            <Image
              src={promo.imagemUrl}
              alt={promo.titulo || 'Promoção'}
              fill
              className="object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === currentIndex ? 'w-4 opacity-100' : 'w-1.5 opacity-40'
              }`}
              style={{
                backgroundColor:
                  index === currentIndex
                    ? 'var(--cardapio-accent-primary)'
                    : 'var(--cardapio-text-secondary)',
              }}
              aria-label={`Ir para promoção ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
