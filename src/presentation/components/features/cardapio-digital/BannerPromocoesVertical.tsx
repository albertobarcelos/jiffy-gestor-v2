'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'

interface BannerPromocao {
  id: string
  imagemUrl: string
  titulo?: string
  link?: string
}

interface BannerPromocoesVerticalProps {
  promocoes?: BannerPromocao[]
}

/**
 * Banner vertical de promoções com rolagem automática
 * Exibe imagens de promoções que rolam automaticamente de cima para baixo
 */
export default function BannerPromocoesVertical({
  promocoes = [],
}: BannerPromocoesVerticalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Promoções mockadas se não houver promoções
  const promocoesExibir = promocoes.length > 0 
    ? promocoes 
    : [
        {
          id: '1',
          imagemUrl: '/images/promo-1.png',
          titulo: 'Promoção 1',
        },
        {
          id: '2',
          imagemUrl: '/images/promo-2.png',
          titulo: 'Promoção 2',
        },
        {
          id: '3',
          imagemUrl: '/images/promo-3.png',
          titulo: 'Promoção 3',
        },
      ]

  // Autoplay - rolagem automática vertical
  useEffect(() => {
    if (!isPaused && promocoesExibir.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % promocoesExibir.length)
      }, 4000) // Muda a cada 4 segundos
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isPaused, promocoesExibir.length])

  // Handlers para drag/swipe vertical
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevenir drag de imagens
    if ((e.target as HTMLElement).tagName === 'IMG') {
      e.preventDefault()
    }
    
    if (!containerRef.current) return
    setIsDragging(true)
    setIsPaused(true)
    setStartY(e.pageY)
    setCurrentY(e.pageY)
    setDragOffset(0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    
    const diff = e.pageY - startY
    const containerHeight = containerRef.current.offsetHeight
    const diffPercent = (diff / containerHeight) * 100
    setCurrentY(e.pageY)
    setDragOffset(diffPercent)
  }

  const handleMouseUp = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!isDragging || !containerRef.current) {
      setIsDragging(false)
      setDragOffset(0)
      setIsPaused(false)
      return
    }
    
    const threshold = containerRef.current.offsetHeight * 0.2 // 20% da altura
    const diff = currentY - startY
    
    if (Math.abs(diff) > threshold) {
      // Muda de slide se arrastou mais de 20% da altura
      if (diff > 0 && currentIndex > 0) {
        // Arrastou para baixo - volta slide anterior
        setCurrentIndex(currentIndex - 1)
      } else if (diff < 0 && currentIndex < promocoesExibir.length - 1) {
        // Arrastou para cima - avança próximo slide
        setCurrentIndex(currentIndex + 1)
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
    setCurrentY(0)
    setTimeout(() => setIsPaused(false), 3000)
  }

  // Handlers para touch (mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return
    setIsDragging(true)
    setIsPaused(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
    setDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    
    const diff = e.touches[0].clientY - startY
    const containerHeight = containerRef.current.offsetHeight
    const diffPercent = (diff / containerHeight) * 100
    setCurrentY(e.touches[0].clientY)
    setDragOffset(diffPercent)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) {
      setIsDragging(false)
      setDragOffset(0)
      setIsPaused(false)
      return
    }
    
    const threshold = containerRef.current.offsetHeight * 0.2
    const diff = currentY - startY
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      } else if (diff < 0 && currentIndex < promocoesExibir.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
    setCurrentY(0)
    setTimeout(() => setIsPaused(false), 3000)
  }

  // Pausar ao passar o mouse
  const handleMouseEnter = () => {
    if (!isDragging) {
      setIsPaused(true)
    }
  }

  const handleMouseLeave = () => {
    if (!isDragging) {
      setIsPaused(false)
    }
  }

  // Adicionar event listeners globais para garantir que o mouse up seja capturado
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseUp = () => {
      if (!containerRef.current) {
        setIsDragging(false)
        setDragOffset(0)
        setIsPaused(false)
        return
      }
      
      const threshold = containerRef.current.offsetHeight * 0.2
      const diff = currentY - startY
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1)
        } else if (diff < 0 && currentIndex < promocoesExibir.length - 1) {
          setCurrentIndex(currentIndex + 1)
        }
      }
      
      setIsDragging(false)
      setDragOffset(0)
      setCurrentY(0)
      setTimeout(() => setIsPaused(false), 3000)
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return
      e.preventDefault()
      
      const diff = e.pageY - startY
      const containerHeight = containerRef.current.offsetHeight
      const diffPercent = (diff / containerHeight) * 100
      setCurrentY(e.pageY)
      setDragOffset(diffPercent)
    }

    window.addEventListener('mousemove', handleGlobalMouseMove)
    window.addEventListener('mouseup', handleGlobalMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, startY, currentY, currentIndex, promocoesExibir.length])

  if (promocoesExibir.length === 0) {
    return null
  }

  // Calcular altura de cada item e offset de transform
  const itemHeightPercent = 100 / promocoesExibir.length
  const baseTransform = currentIndex * itemHeightPercent
  const transformWithDrag = baseTransform - dragOffset

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden rounded-lg cursor-grab active:cursor-grabbing"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        backgroundColor: 'var(--cardapio-bg-elevated)',
        userSelect: 'none',
      }}
    >
      {/* Container com todas as imagens */}
      <div
        className="flex flex-col h-full"
        style={{
          transform: `translateY(-${Math.max(0, Math.min(transformWithDrag, (promocoesExibir.length - 1) * itemHeightPercent))}%)`,
          height: `${promocoesExibir.length * 100}%`,
          transition: isDragging ? 'none' : 'transform 0.5s ease-in-out',
        }}
      >
        {promocoesExibir.map((promocao) => (
          <div
            key={promocao.id}
            className="relative w-full flex-shrink-0"
            style={{ height: `${100 / promocoesExibir.length}%` }}
          >
            <div className="relative w-full h-full">
              {promocao.imagemUrl ? (
                <Image
                  src={promocao.imagemUrl}
                  alt={promocao.titulo || 'Promoção'}
                  fill
                  className="object-fill"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--cardapio-bg-secondary)',
                  }}
                >
                  <span
                    className="text-2xl"
                    style={{ color: 'var(--cardapio-text-tertiary)' }}
                  >
                    🎯
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores de posição (opcional) */}
      {promocoesExibir.length > 1 && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
          {promocoesExibir.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'opacity-100' : 'opacity-40'
              }`}
              style={{
                backgroundColor: index === currentIndex
                  ? 'var(--cardapio-accent-primary)'
                  : 'var(--cardapio-text-secondary)',
              }}
              aria-label={`Ir para promoção ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
