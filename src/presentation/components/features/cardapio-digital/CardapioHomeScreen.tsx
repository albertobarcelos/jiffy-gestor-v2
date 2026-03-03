'use client'

import { useRouter } from 'next/navigation'
import { MdMenuBook, MdShoppingCart, MdRoomService, MdAttachMoney, MdTableRestaurant } from 'react-icons/md'
import { useEffect, useState } from 'react'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import CarrinhoResumo from './CarrinhoResumo'
import CarrosselProdutosDestaque from './CarrosselProdutosDestaque'
import BannerDestaques from './BannerDestaques'
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
  const [carrinhoCount, setCarrinhoCount] = useState(0)
  const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
  const numeroMesa = sessionStorage.getItem('cardapio_numero_mesa') || '?'
  const empresaId = sessionStorage.getItem('cardapio_empresa_id') || ''

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
    <div className="min-h-screen bg-black flex flex-col lg:flex-row">
      {/* Painel Esquerdo - Controles */}
      <div className="w-full lg:w-1/3 bg-black flex flex-col min-h-screen lg:min-h-0">
        {/* Logo no Topo */}
        <div className="px-6 pt-6 pb-4">
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
                <h1 className="text-3xl font-bold text-white mb-1">Giuseppe</h1>
                <p className="text-base text-white/80 font-light">PIZZARIA</p>
              </div>
            )}

            {/* Número da Mesa - à direita do título */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20 flex-shrink-0">
              <MdTableRestaurant className="w-5 h-5 text-white/80" />
              <span className="text-white/90 text-sm font-medium">Mesa</span>
              <span className="text-white text-lg font-bold">{numeroMesa}</span>
            </div>
          </div>

          {/* Texto de Instrução */}
          <p className="text-white/70 text-xs font-light mb-3 lg:mb-4">
            Seja bem-vindo(a), acesse o cardápio e faça seu pedido!
          </p>

          {/* Mobile: Banner e Carrossel dentro do menu */}
          <div className="lg:hidden w-full flex flex-col mb-4">
            {/* Banner Destaques do Dia */}
            <div className="w-full mb-2">
              <BannerDestaques />
            </div>
            
            {/* Carrossel */}
            <div className="h-[45vh] min-h-[300px] overflow-hidden relative w-full rounded-xl">
              <CarrosselProdutosDestaque produtos={[]} />
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex-1 flex flex-col justify-center px-6 pb-4 lg:pb-6 space-y-2 lg:space-y-3">
          {botoes.map((botao, index) => {
            const Icon = botao.icon
            return (
              <button
                key={botao.id}
                onClick={botao.onClick}
                className="
                  bg-white
                  text-black
                  rounded-xl
                  px-6
                  py-4
                  flex
                  items-center
                  gap-4
                  hover:bg-white/90
                  active:scale-95
                  transition-all
                  duration-200
                  shadow-lg
                  hover:shadow-xl
                  group
                "
                style={{
                  animation: `fadeInLeft 0.5s ease-out ${index * 0.1}s both`,
                  animationFillMode: 'both',
                }}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-black group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-lg font-semibold flex-1 text-left">
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
                bg-white/10
                text-white
                border-2
                border-white/30
                rounded-xl
                px-6
                py-4
                flex
                items-center
                gap-4
                hover:bg-white/20
                hover:border-white/50
                active:scale-95
                transition-all
                duration-200
                group
              "
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
          <p className="text-white/40 text-xs text-center">
            Desenvolvido por ConnectPlug
          </p>
        </div>
      </div>

      {/* Painel Direito - Banner e Carrossel de Produtos em Destaque */}
      <div className="hidden lg:flex lg:w-2/3 bg-gradient-to-br from-gray-900 to-black relative h-screen flex-col overflow-hidden">
        {/* Banner Destaques do Dia */}
        <BannerDestaques />
        
        {/* Carrossel */}
        <div className="flex-1 overflow-hidden relative w-full">
          <CarrosselProdutosDestaque produtos={[]} />
        </div>
      </div>

      {/* Resumo Flutuante do Carrinho (apenas em mobile) */}
      <div className="lg:hidden">
        <CarrinhoResumo mesaId={mesaId} />
      </div>
    </div>
  )
}
