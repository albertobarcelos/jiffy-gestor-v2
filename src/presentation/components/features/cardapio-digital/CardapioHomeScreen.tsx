'use client'

import { useRouter } from 'next/navigation'
import { MdMenuBook, MdShoppingCart } from 'react-icons/md'
import { useCardapioTheme } from '@/src/presentation/hooks/useCardapioTheme'
import CarrosselProdutosDestaque from './CarrosselProdutosDestaque'
import ThemeSelector from './ThemeSelector'
import FloatingCircles from './FloatingCircles'
import Image from 'next/image'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { useCardapioCarrinhoStore } from '@/src/presentation/stores/cardapioCarrinhoStore'

interface CardapioHomeScreenProps {
  slug: string
  empresa: EmpresaPublicaDTO
  produtosDestaque: Array<{
    id: string
    nome: string
    imagemUrl?: string | null
    descricao?: string | null
    valor?: number
  }>
}

export default function CardapioHomeScreen({
  slug,
  empresa,
  produtosDestaque,
}: CardapioHomeScreenProps) {
  const router = useRouter()
  const { theme } = useCardapioTheme()
  const carrinhoCount = useCardapioCarrinhoStore(s => s.getResumo(slug).totalItens)

  const borderColorCircles =
    theme === 'clean' ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 255, 255, 0.15)'

  const botoes = [
    {
      id: 'cardapio',
      label: 'Ver cardápio',
      icon: MdMenuBook,
      onClick: () => router.push(`/cardapio/${slug}/catalogo`),
    },
  ]

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      <div
        className="w-full md:w-1/3 flex flex-col min-h-screen md:min-h-0 relative"
        style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
      >
        <FloatingCircles borderColor={borderColorCircles} />

        <div className="px-3 lg:px-6 pt-3 lg:pt-6 pb-2 lg:pb-4">
          <div className="mb-2 lg:mb-4">
            <ThemeSelector />
          </div>

          <div className="flex items-start justify-between gap-2 lg:gap-4 mb-2 lg:mb-4">
            {empresa.logoUrl ? (
              <div className="relative h-16 w-48 flex-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={empresa.logoUrl}
                  alt={empresa.nomeFantasia}
                  className="h-16 w-auto object-contain object-left max-w-full"
                />
              </div>
            ) : (
              <div className="flex-1">
                <h1
                  className="lg:text-3xl text-2xl font-bold mb-1"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  {empresa.nomeFantasia}
                </h1>
                {empresa.segmento && (
                  <p
                    className="text-base font-light uppercase tracking-wide"
                    style={{ color: 'var(--cardapio-text-secondary)' }}
                  >
                    {empresa.segmento}
                  </p>
                )}
              </div>
            )}
          </div>

          <p
            className="text-xs font-light mb-3 md:mb-4"
            style={{ color: 'var(--cardapio-text-tertiary)' }}
          >
            Seja bem-vindo(a)! Faça seu pedido para entrega ou retirada.
          </p>

          <div className="md:hidden w-full flex flex-col mb-4">
            <div className="h-[45vh] min-h-[300px] overflow-hidden relative w-full rounded-xl">
              <CarrosselProdutosDestaque produtos={produtosDestaque} />
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-3 lg:px-6 pb-2 lg:pb-4 md:pb-6 space-y-2 md:space-y-3">
          {botoes.map((botao, index) => {
            const Icon = botao.icon
            return (
              <button
                key={botao.id}
                type="button"
                onClick={botao.onClick}
                className="rounded-xl px-2 lg:px-6 py-2 lg:py-4 flex items-center gap-2 lg:gap-4 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl group"
                style={{
                  backgroundColor: 'var(--cardapio-btn-primary)',
                  color: 'var(--cardapio-btn-primary-text)',
                  animation: `fadeInLeft 0.5s ease-out ${index * 0.1}s both`,
                  animationFillMode: 'both',
                }}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="lg:text-lg text-sm font-semibold flex-1 text-left">
                  {botao.label}
                </span>
              </button>
            )
          })}

          {carrinhoCount > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/cardapio/${slug}/carrinho`)}
              className="border-2 rounded-xl lg:px-6 px-3 lg:py-4 py-2 flex items-center gap-3 lg:gap-4 active:scale-95 transition-all duration-200"
              style={{
                backgroundColor: 'var(--cardapio-bg-elevated)',
                borderColor: 'var(--cardapio-border)',
                color: 'var(--cardapio-text-primary)',
              }}
            >
              <div className="relative">
                <MdShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {carrinhoCount > 9 ? '9+' : carrinhoCount}
                </span>
              </div>
              <span className="lg:text-lg text-sm font-semibold flex-1 text-left">
                Ver carrinho
              </span>
            </button>
          )}
        </div>

        <div className="px-6 pb-4">
          <p className="text-xs text-center" style={{ color: 'var(--cardapio-text-muted)' }}>
            Desenvolvido por ConnectPlug
          </p>
        </div>
      </div>

      <div
        className="hidden md:flex md:w-2/3 relative h-screen flex-col overflow-hidden"
        style={{ background: 'var(--cardapio-gradient-secondary)' }}
      >
        {empresa.bannerUrl ? (
          <div className="relative flex-1 w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={empresa.bannerUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <CarrosselProdutosDestaque produtos={produtosDestaque} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden relative w-full h-full">
            <CarrosselProdutosDestaque produtos={produtosDestaque} />
          </div>
        )}
      </div>
    </div>
  )
}
