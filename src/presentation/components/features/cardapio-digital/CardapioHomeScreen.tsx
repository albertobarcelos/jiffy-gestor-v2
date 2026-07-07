'use client'

import { useRouter } from 'next/navigation'
import { MdMenuBook, MdShoppingCart } from 'react-icons/md'
import CarrosselProdutosDestaque from './CarrosselProdutosDestaque'
import { CardapioHomeBanner } from './CardapioHomeBanner'
import ThemeSelector from './ThemeSelector'
import FloatingCircles from './FloatingCircles'
import type { EmpresaPublicaDTO } from '@/src/application/dto/delivery-publico/DeliveryPublicoDTO'
import { useCardapioCarrinhoTotalItens } from '@/src/presentation/stores/cardapioCarrinhoStore'

/** TODO: substituir por horário vindo do backend por empresa */
const HORARIO_ABERTURA = '09:00'

function BadgeHorarioAbertura() {
  return (
    <p
      className="inline-block w-fit text-sm font-medium mb-2 px-3 py-1.5 rounded-lg"
      style={{
        backgroundColor: 'var(--cardapio-btn-primary)',
        color: 'var(--cardapio-btn-primary-text)',
      }}
    >
      Aberto a partir das {HORARIO_ABERTURA}
    </p>
  )
}

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
  const carrinhoCount = useCardapioCarrinhoTotalItens(slug)

  const borderColorCircles = 'rgba(255, 255, 255, 0.15)'

  const headerBarStyle = {
    backgroundColor: 'var(--cardapio-bg-secondary)',
    borderColor: 'var(--cardapio-border)',
  } as const

  return (
    <div
      className="h-[100dvh] flex flex-col overflow-hidden"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      {/* Barra superior — mobile */}
      <header
        className="lg:hidden sticky top-0 z-30 flex-shrink-0 border-b px-3 py-2 flex items-center gap-2"
        style={headerBarStyle}
      >
        {empresa.logoUrl ? (
          <div className="h-9 w-9 flex-shrink-0 rounded-md overflow-hidden bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={empresa.logoUrl}
              alt=""
              className="h-full w-full object-contain"
            />
          </div>
        ) : (
          <div
            className="h-9 w-9 flex-shrink-0 rounded-md flex items-center justify-center text-xs font-bold"
            style={{
              backgroundColor: 'var(--cardapio-bg-elevated)',
              color: 'var(--cardapio-accent-primary)',
            }}
          >
            {empresa.nomeFantasia.charAt(0).toUpperCase()}
          </div>
        )}

        <h1
          className="flex-1 min-w-0 text-sm font-semibold truncate leading-tight"
          style={{ color: 'var(--cardapio-text-primary)' }}
        >
          {empresa.nomeFantasia}
        </h1>

        <ThemeSelector compact />

        <button
          type="button"
          onClick={() => router.push(`/cardapio/${slug}/carrinho`)}
          className="relative flex-shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-md"
          style={{ color: 'var(--cardapio-text-primary)' }}
          aria-label={
            carrinhoCount > 0 ? `Carrinho com ${carrinhoCount} itens` : 'Carrinho'
          }
        >
          <MdShoppingCart className="w-5 h-5" />
          {carrinhoCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-0.5 flex items-center justify-center">
              {carrinhoCount > 9 ? '9+' : carrinhoCount}
            </span>
          )}
        </button>
      </header>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Destaques — hero / carrossel */}
      <section
        className="w-full lg:w-2/3 relative flex-shrink-0 flex flex-col lg:min-h-0 lg:flex-1 overflow-hidden"
        style={{ background: 'var(--cardapio-gradient-secondary)' }}
      >
        {/* Banner — mobile: antes do card de destaques */}
        <CardapioHomeBanner
          bannerUrl={empresa.bannerUrl}
          className="lg:hidden flex-shrink-0"
        />

        <div className="lg:hidden px-4 pt-3 pb-1 flex-shrink-0">
          <h2
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--cardapio-text-secondary)' }}
          >
            Destaques
          </h2>
        </div>

        <div className="relative flex-1 min-h-[280px] h-[52vh] sm:min-h-[320px] sm:h-[55vh] lg:h-full lg:min-h-0">
          <div className="absolute inset-0">
            <CarrosselProdutosDestaque produtos={produtosDestaque} />
          </div>
        </div>
      </section>

      {/* Painel de ações */}
      <aside
        className="w-full lg:w-1/3 flex flex-col flex-1 relative"
        style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
      >
        <FloatingCircles borderColor={borderColorCircles} />

        {/* Cabeçalho desktop */}
        <div className="hidden lg:block px-6 pt-6 pb-3">
          <div className="mb-4 flex justify-start">
            <ThemeSelector />
          </div>

          <div className="flex items-start gap-3 mb-4">
            {empresa.logoUrl ? (
              <div className="relative h-16 w-full max-w-[12rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={empresa.logoUrl}
                  alt={empresa.nomeFantasia}
                  className="h-16 w-auto object-contain object-left max-w-full"
                />
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <h1
                  className="text-3xl font-bold mb-1 truncate"
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

          <BadgeHorarioAbertura />
          <p
            className="text-sm font-light"
            style={{ color: 'var(--cardapio-text-tertiary)' }}
          >
            Seja bem-vindo(a)! Faça seu pedido para entrega ou retirada.
          </p>
        </div>

        {/* Conteúdo mobile — abaixo dos destaques */}
        <div className="lg:hidden px-4 pt-4 pb-2">
          <BadgeHorarioAbertura />
          <p
            className="text-sm font-light leading-relaxed"
            style={{ color: 'var(--cardapio-text-tertiary)' }}
          >
            Seja bem-vindo(a)! Faça seu pedido para entrega ou retirada.
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center lg:justify-center px-4 sm:px-5 lg:px-6 py-3 lg:py-3 space-y-2 sm:space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => router.push(`/cardapio/${slug}/catalogo`)}
            className="w-full rounded-xl px-4 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 active:scale-[0.98] transition-all duration-200 shadow-lg"
            style={{
              backgroundColor: 'var(--cardapio-btn-primary)',
              color: 'var(--cardapio-btn-primary-text)',
              animation: 'fadeInLeft 0.5s ease-out both',
            }}
          >
            <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
              <MdMenuBook className="w-6 h-6" />
            </div>
            <span className="text-sm sm:text-base lg:text-lg font-semibold flex-1 text-left">
              Ver cardápio
            </span>
          </button>

          {carrinhoCount > 0 && (
            <button
              type="button"
              onClick={() => router.push(`/cardapio/${slug}/carrinho`)}
              className="hidden lg:flex w-full border-2 rounded-xl px-4 py-4 items-center gap-4 active:scale-[0.98] transition-all duration-200"
              style={{
                backgroundColor: 'var(--cardapio-btn-secondary)',
                borderColor: 'var(--cardapio-border)',
                color: 'var(--cardapio-btn-secondary-text)',
              }}
            >
              <div className="relative flex-shrink-0">
                <MdShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {carrinhoCount > 9 ? '9+' : carrinhoCount}
                </span>
              </div>
              <span className="text-lg font-semibold flex-1 text-left">Ver carrinho</span>
            </button>
          )}
        </div>
      </aside>
      </div>
    </div>
  )
}
