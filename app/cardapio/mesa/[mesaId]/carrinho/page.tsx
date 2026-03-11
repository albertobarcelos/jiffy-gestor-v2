'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import CarrinhoCompleto from '@/src/presentation/components/features/cardapio-digital/CarrinhoCompleto'
import { MdArrowBack, MdTableRestaurant } from 'react-icons/md'
import BannerPromocoesVertical from '@/src/presentation/components/features/cardapio-digital/BannerPromocoesVertical'
import ThemeSelector from '@/src/presentation/components/features/cardapio-digital/ThemeSelector'

/**
 * Página do carrinho do cardápio
 */
export default function CarrinhoPage() {
  const params = useParams()
  const router = useRouter()
  const mesaId = params.mesaId as string
  const [isValid, setIsValid] = useState(false)
  const [bannerHeight, setBannerHeight] = useState('calc(100vh - 6rem)')
  const headerRef = useRef<HTMLDivElement>(null)
  const [numeroMesa, setNumeroMesa] = useState<string>('?')

  useEffect(() => {
    const sessionToken = sessionStorage.getItem('cardapio_session_token')
    const storedMesaId = sessionStorage.getItem('cardapio_mesa_id')
    const storedNumeroMesa = sessionStorage.getItem('cardapio_numero_mesa')

    if (!sessionToken || storedMesaId !== mesaId) {
      router.push('/cardapio/instrucoes')
      return
    }

    if (storedNumeroMesa) {
      setNumeroMesa(storedNumeroMesa)
    }

    setIsValid(true)
  }, [mesaId, router])

  // Calcular altura do container baseado na altura do header
  useEffect(() => {
    if (!isValid || !headerRef.current) return

    const updateBannerHeight = () => {
      const headerHeight = headerRef.current?.offsetHeight || 88
      // Altura da viewport menos altura do header
      const calculatedHeight = `calc(100vh - ${headerHeight}px)`
      setBannerHeight(calculatedHeight)
    }

    updateBannerHeight()
    window.addEventListener('resize', updateBannerHeight)
    return () => window.removeEventListener('resize', updateBannerHeight)
  }, [isValid])

  if (!isValid) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
      >
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--cardapio-accent-primary)' }}
        ></div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      {/* Header */}
      <div
        ref={headerRef}
        className="shadow-sm sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--cardapio-bg-elevated)',
          borderBottom: '1px solid var(--cardapio-border)',
        }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Esquerda: Voltar */}
            <div className="flex items-center">
              <button
                onClick={() => router.push(`/cardapio/mesa/${mesaId}/cardapio`)}
                className="text-sm font-medium transition-colors flex items-center gap-1"
                style={{ color: 'var(--cardapio-text-primary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--cardapio-text-secondary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--cardapio-text-primary)'
                }}
              >
                <MdArrowBack className="w-4 h-4" />
                <span>VOLTAR</span>
              </button>
            </div>

            {/* Centro: Título e Número da Mesa */}
            <div className="flex items-center gap-4">
              <div>
                <h1
                  className="text-2xl font-bold"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  Carrinho
                </h1>
                <p
                  className="text-sm"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                >
                  Revise seu pedido
                </p>
              </div>
              <div
                className="h-6 w-px"
                style={{ backgroundColor: 'var(--cardapio-divider)' }}
              />
              <div className="flex items-center gap-2">
                <MdTableRestaurant
                  className="w-5 h-5"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                />
                <span
                  className="text-sm font-semibold"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  Mesa {numeroMesa}
                </span>
              </div>
            </div>

            {/* Direita: Seletor de Tema */}
            <div className="flex items-center gap-3">
              <ThemeSelector />
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div 
        className="flex gap-6 max-w-7xl mx-auto px-4"
        style={{
          height: bannerHeight,
          maxHeight: bannerHeight,
          paddingTop: '1rem',
          paddingBottom: '1rem',
        }}
      >
        {/* Banner Vertical de Promoções - Fixo à esquerda */}
        <div className="w-48 flex-shrink-0 hidden md:block">
          <div
            className="rounded-lg overflow-hidden h-full"
            style={{
              border: '1px solid var(--cardapio-border)',
            }}
          >
            <BannerPromocoesVertical />
          </div>
        </div>

        {/* Conteúdo do Carrinho - Com scroll independente */}
        <div className="flex-1 min-w-0 overflow-y-auto pr-2">
          <CarrinhoCompleto mesaId={mesaId} />
        </div>
      </div>
    </div>
  )
}
