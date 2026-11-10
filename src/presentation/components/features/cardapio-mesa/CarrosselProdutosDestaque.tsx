'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'

export type ProdutoDestaque = {
  id: string
  nome: string
  imagemUrl?: string
  descricao?: string
  valor?: number
}

type Props = {
  produtos?: ProdutoDestaque[]
}

const DESTAQUES_MOCK: ProdutoDestaque[] = [
  {
    id: '1',
    nome: 'Pizza',
    descricao:
      'Pizzas artesanais com ingredientes frescos e selecionados. Massa fina e crocante, recheios generosos e queijo derretido.',
    valor: 45.9,
    imagemUrl: '/images/pizza.jpg',
  },
  {
    id: '2',
    nome: 'Lanche',
    descricao:
      'Lanches suculentos e saborosos. Pão fresquinho, hambúrguer grelhado na chapa e acompanhamentos especiais.',
    valor: 28.9,
    imagemUrl: '/images/lanche.jpg',
  },
  {
    id: '3',
    nome: 'Pastel',
    descricao:
      'Pastéis crocantes e recheados. Massa fina e dourada, recheios variados e saborosos.',
    valor: 12.9,
    imagemUrl: '/images/pastel.jpg',
  },
  {
    id: '4',
    nome: 'Refrigerante',
    descricao:
      'Bebidas geladas e refrescantes. Variedade de sabores para acompanhar seu pedido.',
    valor: 8.9,
    imagemUrl: '/images/refri.png',
  },
]

function formatarPreco(valor: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

/**
 * Carrossel grande de destaques/promoções da home da mesa.
 * Autoplay + swipe; mock local na V1.
 */
export default function CarrosselProdutosDestaque({ produtos = [] }: Props) {
  const slides = produtos.length > 0 ? produtos : DESTAQUES_MOCK
  const [currentIndex, setCurrentIndex] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)
  const [dragging, setDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const currentXRef = useRef(0)

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index)
    setAutoPlay(false)
    window.setTimeout(() => setAutoPlay(true), 5000)
  }, [])

  useEffect(() => {
    if (!autoPlay || dragging || slides.length <= 1) return
    const id = window.setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % slides.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [autoPlay, dragging, slides.length])

  const finishDrag = (endX: number) => {
    const el = containerRef.current
    if (!el) {
      setDragging(false)
      setDragOffset(0)
      return
    }
    const threshold = el.offsetWidth * 0.2
    const diff = endX - startX
    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex > 0) setCurrentIndex(currentIndex - 1)
      else if (diff < 0 && currentIndex < slides.length - 1) {
        setCurrentIndex(currentIndex + 1)
      }
    }
    setDragging(false)
    setDragOffset(0)
    window.setTimeout(() => setAutoPlay(true), 3000)
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
      className="relative h-full w-full select-none overflow-hidden"
      style={{ cursor: dragging ? 'grabbing' : 'grab', userSelect: 'none' }}
      onMouseDown={e => {
        if ((e.target as HTMLElement).tagName === 'IMG') e.preventDefault()
        setDragging(true)
        setAutoPlay(false)
        setStartX(e.pageX)
        currentXRef.current = e.pageX
        setDragOffset(0)
      }}
      onTouchStart={e => {
        setDragging(true)
        setAutoPlay(false)
        setStartX(e.touches[0].pageX)
        currentXRef.current = e.touches[0].pageX
        setDragOffset(0)
      }}
      onTouchMove={e => {
        const el = containerRef.current
        if (!dragging || !el) return
        currentXRef.current = e.touches[0].pageX
        setDragOffset(((e.touches[0].pageX - startX) / el.offsetWidth) * 100)
      }}
      onTouchEnd={() => finishDrag(currentXRef.current)}
    >
      <div
        className="flex h-full"
        style={{
          width: `${slides.length * 100}%`,
          transform: `translateX(-${transform}%)`,
          transition: dragging ? 'none' : 'transform 0.5s ease-in-out',
        }}
      >
        {slides.map((produto, index) => (
          <div
            key={produto.id}
            className="relative h-full shrink-0"
            style={{ width: `${100 / slides.length}%` }}
          >
            <div className="absolute inset-0 overflow-hidden">
              {produto.imagemUrl ? (
                <Image
                  src={produto.imagemUrl}
                  alt={produto.nome}
                  fill
                  className="pointer-events-none scale-105 select-none object-cover"
                  sizes="100vw"
                  priority={index === 0}
                  draggable={false}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-gray-800 to-gray-900" />
              )}
            </div>
            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
            <div className="relative z-[2] flex h-full flex-col justify-between p-6 text-white lg:p-12">
              <h2 className="text-3xl font-bold uppercase drop-shadow-2xl sm:text-4xl lg:text-7xl">
                {produto.nome}
              </h2>
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end md:gap-6">
                {produto.descricao ? (
                  <p className="max-w-2xl flex-1 text-sm leading-relaxed text-white/95 drop-shadow-lg md:text-base lg:text-xl">
                    {produto.descricao}
                  </p>
                ) : null}
                {produto.valor != null ? (
                  <div
                    className="shrink-0 text-2xl font-bold drop-shadow-2xl md:text-3xl lg:text-5xl"
                    style={{ color: 'var(--cardapio-accent-primary, #FF7A00)' }}
                  >
                    {formatarPreco(produto.valor)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {slides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToSlide(index)}
              className={`h-3 rounded-full transition-all ${
                index === currentIndex ? 'w-8 bg-white' : 'w-3 bg-white/50'
              }`}
              aria-label={`Ir para destaque ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
