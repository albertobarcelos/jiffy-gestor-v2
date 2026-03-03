'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Image from 'next/image'

interface ProdutoDestaque {
  id: string
  nome: string
  imagemUrl?: string
  descricao?: string
  valor?: number
}

interface CarrosselProdutosDestaqueProps {
  produtos?: ProdutoDestaque[]
}

/**
 * Carrossel de produtos em destaque
 * Rolagem automática e manual (arrastar)
 */
export default function CarrosselProdutosDestaque({
  produtos = [],
}: CarrosselProdutosDestaqueProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const carrosselRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Produtos mockados se não houver produtos
  const produtosExibir = produtos.length > 0 ? produtos : [
    {
      id: '1',
      nome: 'Pizza',
      descricao: 'Pizzas artesanais com ingredientes frescos e selecionados. Massa fina e crocante, recheios generosos e queijo derretido.',
      valor: 45.90,
      imagemUrl: '/images/pizza.jpg',
    },
    {
      id: '2',
      nome: 'Lanche',
      descricao: 'Lanches suculentos e saborosos. Pão fresquinho, hambúrguer grelhado na chapa e acompanhamentos especiais.',
      valor: 28.90,
      imagemUrl: '/images/lanche.jpg',
    },
    {
      id: '3',
      nome: 'Pastel',
      descricao: 'Pastéis crocantes e recheados. Massa fina e dourada, recheios variados e saborosos. Tradição e qualidade em cada mordida.',
      valor: 12.90,
      imagemUrl: '/images/pastel.jpg',
    },
    {
      id: '4',
      nome: 'Refrigerante',
      descricao: 'Bebidas geladas e refrescantes. Variedade de sabores para acompanhar seu pedido. Sempre gelado e na temperatura ideal.',
      valor: 8.90,
      imagemUrl: '/images/refri.png',
    },
  ]

  // Função para ir para slide específico
  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    // Retomar autoplay após 5 segundos
    setTimeout(() => setIsAutoPlaying(true), 5000)
  }, [])

  // Handlers para drag/swipe
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevenir drag de imagens
    if ((e.target as HTMLElement).tagName === 'IMG') {
      e.preventDefault()
    }
    
    if (!containerRef.current) return
    setIsDragging(true)
    setIsAutoPlaying(false)
    setStartX(e.pageX)
    setCurrentX(e.pageX)
    setDragOffset(0)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    
    const diff = e.pageX - startX
    const containerWidth = containerRef.current.offsetWidth
    const diffPercent = (diff / containerWidth) * 100
    setCurrentX(e.pageX)
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
      return
    }
    
    const threshold = containerRef.current.offsetWidth * 0.2 // 20% da largura
    const diff = currentX - startX
    
    if (Math.abs(diff) > threshold) {
      // Muda de slide se arrastou mais de 20% da largura
      if (diff > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      } else if (diff < 0 && currentIndex < produtosExibir.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
    setStartX(0)
    setCurrentX(0)
    
    // Retomar autoplay após 3 segundos
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  const handleMouseLeave = (e: React.MouseEvent) => {
    if (isDragging) {
      handleMouseUp(e)
    }
  }

  // Touch handlers para mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!containerRef.current) return
    e.preventDefault()
    setIsDragging(true)
    setIsAutoPlaying(false)
    setStartX(e.touches[0].pageX)
    setCurrentX(e.touches[0].pageX)
    setDragOffset(0)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    e.stopPropagation()
    
    const diff = e.touches[0].pageX - startX
    const containerWidth = containerRef.current.offsetWidth
    const diffPercent = (diff / containerWidth) * 100
    setCurrentX(e.touches[0].pageX)
    setDragOffset(diffPercent)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isDragging || !containerRef.current) {
      setIsDragging(false)
      setDragOffset(0)
      return
    }
    
    const threshold = containerRef.current.offsetWidth * 0.2
    const diff = currentX - startX
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1)
      } else if (diff < 0 && currentIndex < produtosExibir.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
    
    setIsDragging(false)
    setDragOffset(0)
    setStartX(0)
    setCurrentX(0)
    setTimeout(() => setIsAutoPlaying(true), 3000)
  }

  // Autoplay
  useEffect(() => {
    if (isAutoPlaying && produtosExibir.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % produtosExibir.length)
      }, 5000) // Muda a cada 5 segundos
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
  }, [isAutoPlaying, produtosExibir.length])


  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  // Adicionar event listeners globais para garantir que o mouse up seja capturado
  useEffect(() => {
    if (!isDragging) return

    const handleGlobalMouseUp = () => {
      if (!containerRef.current) {
        setIsDragging(false)
        setDragOffset(0)
        return
      }
      
      const threshold = containerRef.current.offsetWidth * 0.2
      const diff = currentX - startX
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1)
        } else if (diff < 0 && currentIndex < produtosExibir.length - 1) {
          setCurrentIndex(currentIndex + 1)
        }
      }
      
      setIsDragging(false)
      setDragOffset(0)
      setStartX(0)
      setCurrentX(0)
      setTimeout(() => setIsAutoPlaying(true), 3000)
    }

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const diff = e.pageX - startX
        const containerWidth = containerRef.current.offsetWidth
        const diffPercent = (diff / containerWidth) * 100
        setCurrentX(e.pageX)
        setDragOffset(diffPercent)
      }
    }

    document.addEventListener('mouseup', handleGlobalMouseUp, { passive: false })
    document.addEventListener('mousemove', handleGlobalMouseMove, { passive: false })

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp)
      document.removeEventListener('mousemove', handleGlobalMouseMove)
    }
  }, [isDragging, startX, currentX, currentIndex, produtosExibir.length])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Container do Carrossel */}
      <div
        ref={carrosselRef}
        className="flex h-full transition-transform duration-500 ease-in-out"
        style={{
          transform: `translateX(calc(-${currentIndex * (100 / produtosExibir.length)}% + ${dragOffset / produtosExibir.length}%))`,
          transition: isDragging ? 'none' : 'transform 0.5s ease-in-out',
          width: `${produtosExibir.length * 100}%`,
        }}
      >
        {produtosExibir.map((produto) => (
          <div
            key={produto.id}
            className="h-full relative flex-shrink-0"
            style={{ 
              width: `${100 / produtosExibir.length}%`,
              minWidth: `${100 / produtosExibir.length}%`,
              flexShrink: 0,
            }}
          >
            {/* Imagem de Fundo - Ocupa toda a área */}
            <div className="absolute inset-0 overflow-hidden">
              {produto.imagemUrl ? (
                <Image
                  src={produto.imagemUrl}
                  alt={produto.nome}
                  fill
                  className="object-cover scale-105 blur-[0.5px] pointer-events-none select-none"
                  sizes="100vw"
                  priority={produto.id === produtosExibir[0].id}
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
              )}
            </div>
            {/* Overlay escuro para melhor legibilidade do texto - Fora do container da imagem para garantir cobertura total */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60 z-[1]" />

            {/* Conteúdo do Produto - Textos Sobrepostos */}
            <div className="relative z-[2] h-full flex flex-col justify-between p-8 md:p-12 text-white">
              {/* Nome do Produto - Topo Esquerda */}
              <div className="flex-shrink-0">
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold drop-shadow-2xl">
                  {produto.nome.toUpperCase()}
                </h2>
              </div>

              {/* Descrição e Preço - Embaixo */}
              <div className="flex-shrink-0 flex flex-col md:flex-row items-start md:items-end justify-between gap-4 md:gap-6">
                {/* Descrição - Esquerda */}
                {produto.descricao && (
                  <p className="text-base md:text-lg lg:text-xl text-white/95 max-w-2xl drop-shadow-lg leading-relaxed flex-1">
                    {produto.descricao}
                  </p>
                )}
                
                {/* Preço - Direita */}
                {produto.valor && (
                  <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary drop-shadow-2xl flex-shrink-0">
                    {formatarPreco(produto.valor)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores de Slide */}
      {produtosExibir.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {produtosExibir.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`
                w-3 h-3 rounded-full transition-all duration-200
                ${
                  index === currentIndex
                    ? 'bg-white w-8'
                    : 'bg-white/50 hover:bg-white/75'
                }
              `}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}

    </div>
  )
}
