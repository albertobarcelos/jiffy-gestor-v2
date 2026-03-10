'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { obterCarrinho, modificarItemCarrinho, removerItemCarrinho, enviarPedido } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { Carrinho, CarrinhoItem } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import CarrinhoItemCard from './CarrinhoItemCard'
import { showToast } from '@/src/shared/utils/toast'
import { MdShoppingCart, MdSend } from 'react-icons/md'

interface CarrinhoCompletoProps {
  mesaId: string
}

/**
 * Componente completo do carrinho
 * Exibe lista de itens, permite modificações e envio do pedido
 */
export default function CarrinhoCompleto({ mesaId }: CarrinhoCompletoProps) {
  const router = useRouter()
  const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
  const [carrinho, setCarrinho] = useState<Carrinho>({
    itens: [],
    subtotal: 0,
    total: 0,
    totalItens: 0,
  })
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const carregarCarrinho = async () => {
    try {
      setLoading(true)
      const dados = await obterCarrinho(sessionId)
      setCarrinho(dados)
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error)
      showToast.error('Erro ao carregar carrinho')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarCarrinho()
    
    // Atualizar carrinho periodicamente
    const interval = setInterval(carregarCarrinho, 2000)
    return () => clearInterval(interval)
  }, [sessionId])

  const handleModificarQuantidade = async (itemId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) {
      handleRemoverItem(itemId)
      return
    }

    try {
      const dados = await modificarItemCarrinho(sessionId, itemId, novaQuantidade)
      setCarrinho(dados)
      showToast.success('Quantidade atualizada')
    } catch (error) {
      console.error('Erro ao modificar item:', error)
      showToast.error('Erro ao atualizar quantidade')
    }
  }

  const handleRemoverItem = async (itemId: string) => {
    if (!confirm('Deseja remover este item do carrinho?')) {
      return
    }

    try {
      const dados = await removerItemCarrinho(sessionId, itemId)
      setCarrinho(dados)
      showToast.success('Item removido do carrinho')
    } catch (error) {
      console.error('Erro ao remover item:', error)
      showToast.error('Erro ao remover item')
    }
  }

  const handleEnviarPedido = async () => {
    if (carrinho.itens.length === 0) {
      showToast.error('Carrinho vazio')
      return
    }

    if (!confirm('Deseja enviar este pedido para a cozinha?')) {
      return
    }

    setEnviando(true)
    try {
      const resultado = await enviarPedido(sessionId)
      if (resultado.success) {
        showToast.success(resultado.mensagem || 'Pedido enviado com sucesso!')
        // Limpar carrinho
        setCarrinho({
          itens: [],
          subtotal: 0,
          total: 0,
          totalItens: 0,
        })
        // Redirecionar para tela inicial
        setTimeout(() => {
          router.push(`/cardapio/mesa/${mesaId}`)
        }, 1500)
      }
    } catch (error) {
      console.error('Erro ao enviar pedido:', error)
      showToast.error('Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (carrinho.itens.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <MdShoppingCart className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Carrinho vazio</h2>
          <p className="text-gray-600 mb-6">Adicione produtos ao carrinho para continuar</p>
          <button
            onClick={() => router.push(`/cardapio/mesa/${mesaId}/cardapio`)}
            className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Ver Cardápio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Itens */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Itens do Pedido</h2>
          {carrinho.itens.map((item, index) => (
            <div
              key={item.id}
              style={{
                animation: `fadeInUp 0.3s ease-out ${index * 0.05}s both`,
              }}
            >
              <CarrinhoItemCard
                item={item}
                onModificarQuantidade={(novaQuantidade) =>
                  handleModificarQuantidade(item.id, novaQuantidade)
                }
                onRemover={() => handleRemoverItem(item.id)}
              />
            </div>
          ))}
        </div>

        {/* Resumo Fixo */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Resumo</h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal</span>
                <span className="font-semibold">{formatarPreco(carrinho.subtotal)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatarPreco(carrinho.total)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleEnviarPedido}
              disabled={enviando || carrinho.itens.length === 0}
              className="w-full bg-primary text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <MdSend className="w-5 h-5" />
                  <span>Enviar para Cozinha</span>
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center mt-4">
              {carrinho.totalItens} {carrinho.totalItens === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
