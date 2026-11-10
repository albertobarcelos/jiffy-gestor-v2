'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdAttachMoney, MdMenuBook, MdRoomService, MdShoppingCart, MdTableRestaurant } from 'react-icons/md'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { useCardapioMesaTheme } from '@/src/presentation/hooks/cardapio-mesa/useCardapioMesaTheme'
import { lerMesaQrSession } from './mesaQrSession'
import ThemeSelector from './ThemeSelector'
import FloatingCircles from './FloatingCircles'
import CarrosselProdutosDestaque from './CarrosselProdutosDestaque'
import CarrinhoCompleto from './CarrinhoCompleto'

type CardapioMesaHomeScreenProps = {
  mesaId: string
}

export default function CardapioMesaHomeScreen({ mesaId }: CardapioMesaHomeScreenProps) {
  const router = useRouter()
  const { theme } = useCardapioMesaTheme()
  const [carrinhoCount, setCarrinhoCount] = useState(0)
  const [carrinhoAberto, setCarrinhoAberto] = useState(false)
  const session = lerMesaQrSession()
  const sessionId = session?.sessionToken || mesaId
  const numeroMesa = session?.numeroMesa || '?'

  const atualizarCarrinhoCount = () => {
    void obterCarrinho(sessionId).then(c => setCarrinhoCount(c.totalItens))
  }

  const borderColorCircles =
    theme === 'clean' ? 'rgba(100, 100, 100, 0.3)' : 'rgba(255, 255, 255, 0.15)'

  useEffect(() => {
    const carregar = async () => {
      try {
        const carrinho = await obterCarrinho(sessionId)
        setCarrinhoCount(carrinho.totalItens)
      } catch {
        /* ignore */
      }
    }
    carregar()
    const interval = setInterval(carregar, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const botoes = [
    {
      id: 'cardapio',
      label: 'Cardápio',
      icon: MdMenuBook,
      onClick: () => router.push(`/cardapio-mesa/mesa/${mesaId}/cardapio`),
    },
    {
      id: 'garcom',
      label: 'Chamar garçom',
      icon: MdRoomService,
      onClick: () => router.push(`/cardapio-mesa/mesa/${mesaId}/chamar-garcom`),
    },
    {
      id: 'conta',
      label: 'Fechar conta',
      icon: MdAttachMoney,
      onClick: () => router.push(`/cardapio-mesa/mesa/${mesaId}/fechar-conta`),
    },
  ]

  return (
    <div
      className="flex min-h-screen flex-col md:h-[100dvh] md:flex-row md:overflow-hidden"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      <div
        className="relative flex min-h-screen w-full flex-col md:h-full md:min-h-0 md:w-1/3"
        style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
      >
        <FloatingCircles borderColor={borderColorCircles} />
        <div className="relative z-10 px-3 pb-2 pt-3 lg:px-6 lg:pb-4 lg:pt-6">
          <div className="mb-2 lg:mb-4">
            <ThemeSelector />
          </div>
          <div className="mb-2 flex items-start justify-between gap-2 lg:mb-4 lg:gap-4">
            <div className="min-w-0 flex-1">
              <h1
                className="mb-1 text-2xl font-bold lg:text-3xl"
                style={{ color: 'var(--cardapio-text-primary)' }}
              >
                Cardápio da mesa
              </h1>
              <p className="text-base font-light" style={{ color: 'var(--cardapio-text-secondary)' }}>
                Faça seu pedido
              </p>
            </div>
            <div
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5"
              style={{ backgroundColor: 'var(--cardapio-bg-elevated, rgba(255,255,255,0.08))' }}
            >
              <MdTableRestaurant className="h-5 w-5" style={{ color: 'var(--cardapio-accent-primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--cardapio-text-primary)' }}>
                Mesa {numeroMesa}
              </span>
            </div>
          </div>

          <p
            className="mb-3 text-xs font-light md:mb-4"
            style={{ color: 'var(--cardapio-text-tertiary, var(--cardapio-text-secondary))' }}
          >
            Seja bem-vindo(a), acesse o cardápio e faça seu pedido!
          </p>

          <div className="mb-4 flex w-full flex-col md:hidden">
            <div className="relative h-[45vh] min-h-[300px] w-full overflow-hidden rounded-xl">
              <CarrosselProdutosDestaque />
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-center gap-2 px-3 pb-2 lg:gap-3 lg:px-6 lg:pb-4">
          {botoes.map(botao => {
            const Icon = botao.icon
            return (
              <button
                key={botao.id}
                type="button"
                onClick={botao.onClick}
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-md transition hover:opacity-90 lg:py-4"
                style={{
                  backgroundColor: 'var(--cardapio-btn-primary, var(--cardapio-accent-primary))',
                  color: 'var(--cardapio-btn-primary-text, #fff)',
                }}
              >
                <span className="flex h-10 w-10 items-center justify-center">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="flex-1 text-sm font-semibold lg:text-lg">{botao.label}</span>
              </button>
            )
          })}

          {carrinhoCount > 0 ? (
            <button
              type="button"
              onClick={() => setCarrinhoAberto(true)}
              className="flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition lg:py-4"
              style={{
                backgroundColor: 'var(--cardapio-bg-elevated)',
                borderColor: 'var(--cardapio-border)',
                color: 'var(--cardapio-text-primary)',
              }}
            >
              <span className="relative">
                <MdShoppingCart className="h-6 w-6" />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  {carrinhoCount > 9 ? '9+' : carrinhoCount}
                </span>
              </span>
              <span className="flex-1 text-sm font-semibold lg:text-lg">Ver Carrinho</span>
            </button>
          ) : null}
        </div>

        <div className="relative z-10 px-6 pb-4">
          <p
            className="text-center text-xs"
            style={{ color: 'var(--cardapio-text-muted, var(--cardapio-text-secondary))' }}
          >
            Desenvolvido por ConnectPlug
          </p>
        </div>
      </div>

      <div
        className="relative hidden h-screen w-2/3 flex-col overflow-hidden md:flex"
        style={{ background: 'var(--cardapio-gradient-secondary, var(--cardapio-bg-secondary))' }}
      >
        <div className="relative h-full w-full flex-1 overflow-hidden">
          <CarrosselProdutosDestaque />
        </div>
      </div>

      <CarrinhoCompleto
        mesaId={mesaId}
        variant="panel"
        open={carrinhoAberto}
        onClose={() => setCarrinhoAberto(false)}
        onChanged={atualizarCarrinhoCount}
        onContinueShopping={() => {
          setCarrinhoAberto(false)
          router.push(`/cardapio-mesa/mesa/${mesaId}/cardapio`)
        }}
        onAfterEnviar={() => {
          setCarrinhoAberto(false)
          atualizarCarrinhoCount()
        }}
      />
    </div>
  )
}
