'use client'

import { useRouter } from 'next/navigation'
import { MdMenuBook, MdShoppingCart, MdRoomService, MdAttachMoney, MdTableRestaurant } from 'react-icons/md'
import { useEffect, useState } from 'react'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { useCardapioTheme } from '@/src/presentation/hooks/useCardapioTheme'
import CarrinhoResumo from './CarrinhoResumo'
import CarrosselProdutosDestaque from './CarrosselProdutosDestaque'
import ThemeSelector from './ThemeSelector'
import FloatingCircles from './FloatingCircles'
import Image from 'next/image'

interface CardapioHomeScreenProps {
  mesaId: string
}

/**
 * Tela inicial do cardápio digital
 * Layout dividido: painel escuro à esquerda com botões, carrossel à direita
 */
export default function CardapioHomeScreen({ mesaId }: CardapioHomeScreenProps) {
  const router = useRouter()
  const { theme } = useCardapioTheme()
  const [carrinhoCount, setCarrinhoCount] = useState(0)
  const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
  const numeroMesa = sessionStorage.getItem('cardapio_numero_mesa') || '?'
  const empresaId = sessionStorage.getItem('cardapio_empresa_id') || ''
  
  // Cor da borda dos círculos: cinza escuro para tema Premium (clean), branco para outros
  const borderColorCircles = theme === 'clean' 
    ? 'rgba(100, 100, 100, 0.3)' // Cinza mais escuro para tema Premium
    : 'rgba(255, 255, 255, 0.15)' // Branco para outros temas

  // TODO: Buscar logo e imagem do estabelecimento do backend
  // Por enquanto, usando placeholders
  const logoUrl = undefined // Será buscado do backend
  const imagemBannerUrl = undefined // Será buscado do backend

  useEffect(() => {
    // Carregar contador do carrinho
    const carregarCarrinho = async () => {
      try {
        const carrinho = await obterCarrinho(sessionId)
        setCarrinhoCount(carrinho.totalItens)
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error)
      }
    }

    carregarCarrinho()

    // Atualizar contador periodicamente
    const interval = setInterval(carregarCarrinho, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const botoes = [
    {
      id: 'cardapio',
      label: 'Cardápio',
      icon: MdMenuBook,
      onClick: () => router.push(`/cardapio/mesa/${mesaId}/cardapio`),
    },
    {
      id: 'garcom',
      label: 'Chamar garçom',
      icon: MdRoomService,
      onClick: () => router.push(`/cardapio/mesa/${mesaId}/chamar-garcom`),
    },
    {
      id: 'conta',
      label: 'Fechar conta',
      icon: MdAttachMoney,
      onClick: () => router.push(`/cardapio/mesa/${mesaId}/fechar-conta`),
    },
  ]

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      {/* Painel Esquerdo - Controles */}
      <div
        className="w-full md:w-1/3 flex flex-col min-h-screen md:min-h-0 relative"
        style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
      >
        {/* Círculos flutuantes animados no fundo */}
        <FloatingCircles borderColor={borderColorCircles} />
        {/* Logo no Topo */}
        <div className="px-6 pt-6 pb-4">
          {/* Seletor de Tema - acima do título */}
          <div className="mb-4">
            <ThemeSelector />
          </div>

          {/* Título e Mesa na mesma linha */}
          <div className="flex items-start justify-between gap-4 mb-4">
            {logoUrl ? (
              <div className="relative h-16 w-auto flex-1">
                <Image
                  src={logoUrl}
                  alt="Logo do Estabelecimento"
                  fill
                  className="object-contain object-left"
                  sizes="200px"
                />
              </div>
            ) : (
              <div className="flex-1">
                <h1
                  className="text-3xl font-bold mb-1"
                  style={{ color: 'var(--cardapio-text-primary)' }}
                >
                  Giuseppe
                </h1>
                <p
                  className="text-base font-light"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                >
                  PIZZARIA
                </p>
              </div>
            )}

            {/* Número da Mesa - à direita do título */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg backdrop-blur-sm border flex-shrink-0"
              style={{
                backgroundColor: 'var(--cardapio-bg-elevated)',
                borderColor: 'var(--cardapio-border)',
              }}
            >
              <MdTableRestaurant
                className="w-5 h-5"
                style={{ color: 'var(--cardapio-text-secondary)' }}
              />
              <span
                className="text-sm font-medium"
                style={{ color: 'var(--cardapio-text-secondary)' }}
              >
                Mesa
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: 'var(--cardapio-text-primary)' }}
              >
                {numeroMesa}
              </span>
            </div>
          </div>

          {/* Texto de Instrução */}
          <p
            className="text-xs font-light mb-3 md:mb-4"
            style={{ color: 'var(--cardapio-text-tertiary)' }}
          >
            Seja bem-vindo(a), acesse o cardápio e faça seu pedido!
          </p>

          {/* Mobile: Banner e Carrossel dentro do menu */}
          <div className="md:hidden w-full flex flex-col mb-4">
           
            {/* Carrossel */}
            <div className="h-[45vh] min-h-[300px] overflow-hidden relative w-full rounded-xl">
              <CarrosselProdutosDestaque produtos={[]} />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex-1 flex flex-col justify-center px-6 pb-4 md:pb-6 space-y-2 md:space-y-3">
          {botoes.map((botao, index) => {
            const Icon = botao.icon
            return (
              <button
                key={botao.id}
                onClick={botao.onClick}
                className="
                  rounded-xl
                  px-6
                  py-4
                  flex
                  items-center
                  gap-4
                  active:scale-95
                  transition-all
                  duration-200
                  shadow-lg
                  hover:shadow-xl
                  group
                "
                style={{
                  backgroundColor: 'var(--cardapio-btn-primary)',
                  color: 'var(--cardapio-btn-primary-text)',
                  animation: `fadeInLeft 0.5s ease-out ${index * 0.1}s both`,
                  animationFillMode: 'both',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-primary)'
                }}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon
                    className="w-6 h-6 group-hover:scale-110 transition-transform"
                    style={{ color: 'var(--cardapio-btn-primary-text)' }}
                  />
                </div>
                <span
                  className="text-lg font-semibold flex-1 text-left"
                  style={{ color: 'var(--cardapio-btn-primary-text)' }}
                >
                  {botao.label}
                </span>
                <svg
                  className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            )
          })}

          {/* Botão Carrinho (se houver itens) */}
          {carrinhoCount > 0 && (
            <button
              onClick={() => router.push(`/cardapio/mesa/${mesaId}/carrinho`)}
              className="
                border-2
                rounded-xl
                px-6
                py-4
                flex
                items-center
                gap-4
                active:scale-95
                transition-all
                duration-200
                group
              "
              style={{
                backgroundColor: 'var(--cardapio-bg-elevated)',
                borderColor: 'var(--cardapio-border)',
                color: 'var(--cardapio-text-primary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                e.currentTarget.style.borderColor = 'var(--cardapio-border-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-elevated)'
                e.currentTarget.style.borderColor = 'var(--cardapio-border)'
              }}
            >
              <div className="relative">
                <MdShoppingCart className="w-6 h-6" />
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {carrinhoCount > 9 ? '9+' : carrinhoCount}
                </span>
              </div>
              <span className="text-lg font-semibold flex-1 text-left">
                Ver Carrinho
              </span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-4">
          <p
            className="text-xs text-center"
            style={{ color: 'var(--cardapio-text-muted)' }}
          >
            Desenvolvido por ConnectPlug
          </p>
        </div>
      </div>

      {/* Painel Direito - Carrossel de Produtos em Destaque (imagem ocupa todo espaço) */}
      <div
        className="hidden md:flex md:w-2/3 relative h-screen flex-col overflow-hidden"
        style={{
          background: 'var(--cardapio-gradient-secondary)',
        }}
      >
        {/* Carrossel ocupa todo o espaço */}
        <div className="flex-1 overflow-hidden relative w-full h-full">
          <CarrosselProdutosDestaque produtos={[]} />
        </div>
      </div>

      {/* Resumo Flutuante do Carrinho (apenas em mobile) */}
      <div className="md:hidden">
        <CarrinhoResumo mesaId={mesaId} />
      </div>
    </div>
  )
}
