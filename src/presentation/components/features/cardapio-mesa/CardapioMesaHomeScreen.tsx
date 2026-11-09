'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MdAttachMoney, MdMenuBook, MdRoomService, MdShoppingCart, MdTableRestaurant } from 'react-icons/md'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio-mesa/cardapioMesaApiService'
import { useCardapioMesaTheme } from '@/src/presentation/hooks/cardapio-mesa/useCardapioMesaTheme'
import { lerMesaQrSession } from './mesaQrSession'
import ThemeSelector from './ThemeSelector'
import FloatingCircles from './FloatingCircles'

type CardapioMesaHomeScreenProps = {
  mesaId: string
}

export default function CardapioMesaHomeScreen({ mesaId }: CardapioMesaHomeScreenProps) {
  const router = useRouter()
  const { theme } = useCardapioMesaTheme()
  const [carrinhoCount, setCarrinhoCount] = useState(0)
  const session = lerMesaQrSession()
  const sessionId = session?.sessionToken || mesaId
  const numeroMesa = session?.numeroMesa || '?'

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
      className="flex min-h-screen flex-col md:flex-row"
      style={{ backgroundColor: 'var(--cardapio-bg-primary)' }}
    >
      <div
        className="relative flex min-h-screen w-full flex-col md:w-1/3 md:min-h-0"
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
        </div>

        <div className="relative z-10 flex flex-1 flex-col gap-3 px-3 pb-4 lg:px-6">
          {botoes.map(botao => {
            const Icon = botao.icon
            return (
              <button
                key={botao.id}
                type="button"
                onClick={botao.onClick}
                className="flex items-center gap-3 rounded-2xl px-4 py-4 text-left shadow-md transition hover:opacity-90"
                style={{
                  backgroundColor: 'var(--cardapio-bg-secondary)',
                  color: 'var(--cardapio-text-primary)',
                }}
              >
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: 'var(--cardapio-accent-primary)', color: '#fff' }}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-lg font-semibold">{botao.label}</span>
              </button>
            )
          })}
        </div>

        <div className="relative z-10 border-t px-3 py-3 lg:px-6" style={{ borderColor: 'var(--cardapio-border, #333)' }}>
          <button
            type="button"
            onClick={() => router.push(`/cardapio-mesa/mesa/${mesaId}/carrinho`)}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
            style={{ backgroundColor: 'var(--cardapio-accent-primary, #FF7A00)' }}
          >
            <MdShoppingCart className="h-5 w-5" />
            Ver carrinho
            {carrinhoCount > 0 ? (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs">
                {carrinhoCount > 99 ? '99+' : carrinhoCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div
        className="hidden flex-1 items-center justify-center p-8 md:flex"
        style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
      >
        <p className="max-w-sm text-center text-sm" style={{ color: 'var(--cardapio-text-secondary)' }}>
          Escolha Cardápio para ver os produtos do menu (mesmo catálogo do pedido balcão). Pedido
          nesta V1 ainda é simulado.
        </p>
      </div>
    </div>
  )
}
