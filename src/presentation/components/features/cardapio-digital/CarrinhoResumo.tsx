'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obterCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { Carrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { MdShoppingCart } from 'react-icons/md'

interface CarrinhoResumoProps {
  mesaId: string
}

/**
 * Resumo flutuante do carrinho
 * Exibe contador de itens e total
 * Fixo no canto inferior direito
 */
export default function CarrinhoResumo({ mesaId }: CarrinhoResumoProps) {
  const router = useRouter()
  const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
  const [carrinho, setCarrinho] = useState<Carrinho | null>(null)

  useEffect(() => {
    const carregarCarrinho = async () => {
      try {
        const dados = await obterCarrinho(sessionId)
        setCarrinho(dados)
      } catch (error) {
        console.error('Erro ao carregar carrinho:', error)
      }
    }

    carregarCarrinho()

    // Atualizar periodicamente
    const interval = setInterval(carregarCarrinho, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  if (!carrinho || carrinho.totalItens === 0) {
    return null
  }

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <button
      onClick={() => router.push(`/cardapio/mesa/${mesaId}/carrinho`)}
      className="fixed bottom-6 right-6 bg-primary text-white rounded-2xl shadow-2xl hover:shadow-3xl transform hover:scale-105 transition-all duration-300 p-4 z-50 flex items-center gap-3 group"
    >
      <div className="relative">
        <MdShoppingCart className="w-6 h-6" />
        {carrinho.totalItens > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {carrinho.totalItens > 9 ? '9+' : carrinho.totalItens}
          </span>
        )}
      </div>
      <div className="text-left">
        <div className="text-xs opacity-90">Total</div>
        <div className="text-lg font-bold">{formatarPreco(carrinho.total)}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <svg
          className="w-5 h-5"
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
      </div>
    </button>
  )
}
