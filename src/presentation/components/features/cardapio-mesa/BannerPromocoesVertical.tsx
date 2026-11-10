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
 * Carrossel vertical de promoções (desktop) — entre menu e lista.
 * Autoplay a cada 4s; swipe/drag vertical.
 */
export default function BannerPromocoesVertical({ promocoes = [] }: Props) {
  const slides = promocoes.length > 0 ? promocoes : PROMOCOES_MOCK_CARDAPIO_MESA
  const [currentIndex, setCurrentIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentYRef = useRef(0)

  useEffect(() => {
    if (paused || dragging || slides.length <= 1) return
    const id = window.setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length)
    }, 4000)
    return () => window.clearInterval(id)
  }, [paused, dragging, slides.length])

  const finishDrag = (endY: number) => {
    const el = containerRef.current
    if (!el) {
      setDragging(false)
      setDragOffset(0)
      setPaused(false)
      return
    }
    const threshold = el.offsetHeight * 0.2
    const diff = endY - startY
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) setCurrentIndex(currentIndex - 1)
      else if (diff < 0 && currentIndex < slides.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
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
      currentYRef.current = e.pageY
      setDragOffset(((e.pageY - startY) / el.offsetHeight) * 100)
    }
    const onUp = () => finishDrag(currentYRef.current)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- finishDrag fecha o gesto atual
  }, [dragging, startY, currentIndex, slides.length])

  if (slides.length === 0) return null

  const itemHeightPercent = 100 / slides.length
  const transform = Math.max(
    0,
    Math.min(currentIndex * itemHeightPercent - dragOffset, (slides.length - 1) * itemHeightPercent)
  )

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full cursor-grab overflow-hidden rounded-lg active:cursor-grabbing"
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
        setStartY(e.pageY)
        currentYRef.current = e.pageY
        setDragOffset(0)
      }}
      onTouchStart={e => {
        setDragging(true)
        setPaused(true)
        setStartY(e.touches[0].clientY)
        currentYRef.current = e.touches[0].clientY
        setDragOffset(0)
      }}
      onTouchMove={e => {
        const el = containerRef.current
        if (!dragging || !el) return
        currentYRef.current = e.touches[0].clientY
        setDragOffset(((e.touches[0].clientY - startY) / el.offsetHeight) * 100)
      }}
      onTouchEnd={() => finishDrag(currentYRef.current)}
    >
      <div
        className="flex h-full flex-col"
        style={{
          transform: `translateY(-${transform}%)`,
          height: `${slides.length * 100}%`,
          transition: dragging ? 'none' : 'transform 0.5s ease-in-out',
        }}
      >
        {slides.map(promo => (
          <div
            key={promo.id}
            className="relative w-full shrink-0"
            style={{ height: `${100 / slides.length}%` }}
          >
            <div className="relative h-full w-full">
              <Image
                src={promo.imagemUrl}
                alt={promo.titulo || 'Promoção'}
                fill
                className="object-cover"
                draggable={false}
              />
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className={`h-2 w-2 rounded-full transition-opacity ${
                index === currentIndex ? 'opacity-100' : 'opacity-40'
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
