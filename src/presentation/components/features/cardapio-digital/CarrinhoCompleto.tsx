'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { obterCarrinho, modificarItemCarrinho, removerItemCarrinho, enviarPedido } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { Carrinho, CarrinhoItem } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import CarrinhoItemCard from './CarrinhoItemCard'
import { showToast } from '@/src/shared/utils/toast'
import { MdShoppingCart, MdSend } from 'react-icons/md'
import { Produto } from '@/src/domain/entities/Produto'
import { useAuthStore } from '@/src/presentation/stores/authStore'
import ProdutoConfiguracaoModal from './ProdutoConfiguracaoModal'

interface CarrinhoCompletoProps {
  mesaId: string
}

/**
 * Componente completo do carrinho
 * Exibe lista de itens, permite modificações e envio do pedido
 */
export default function CarrinhoCompleto({ mesaId }: CarrinhoCompletoProps) {
  const router = useRouter()
  const { auth } = useAuthStore()
  const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
  const [carrinho, setCarrinho] = useState<Carrinho>({
    itens: [],
    subtotal: 0,
    total: 0,
    totalItens: 0,
  })
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null)

  // Memoizar itemCarrinho para evitar recriação a cada render
  const itemCarrinhoMemo = useMemo(
    () => (itemEditandoId ? carrinho.itens.find((item) => item.id === itemEditandoId) : undefined),
    [carrinho.itens, itemEditandoId]
  )

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

  const handleEditarItem = async (item: CarrinhoItem) => {
    try {
      setItemEditandoId(item.id)
      
      // Buscar produto do backend
      const token = auth?.getAccessToken()
      if (!token) {
        showToast.error('Token não encontrado')
        return
      }

      const response = await fetch(`/api/produtos/${item.produtoId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar produto')
      }

      const produtoData = await response.json()
      const produto = Produto.fromJSON(produtoData)
      setProdutoSelecionado(produto)
    } catch (error) {
      console.error('Erro ao carregar produto:', error)
      showToast.error('Erro ao carregar produto para edição')
      setItemEditandoId(null)
    }
  }

  const handleProdutoAdicionado = async () => {
    // Remover item antigo se estava editando
    if (itemEditandoId) {
      try {
        await removerItemCarrinho(sessionId, itemEditandoId)
        await carregarCarrinho()
      } catch (error) {
        console.error('Erro ao remover item antigo:', error)
      }
      setItemEditandoId(null)
    } else {
      await carregarCarrinho()
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
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--cardapio-accent-primary)' }}
        ></div>
      </div>
    )
  }

  if (carrinho.itens.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div
          className="rounded-2xl shadow-lg p-12 text-center"
          style={{ backgroundColor: 'var(--cardapio-card-bg)' }}
        >
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
          >
            <MdShoppingCart
              className="w-12 h-12"
              style={{ color: 'var(--cardapio-text-tertiary)' }}
            />
          </div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ color: 'var(--cardapio-text-primary)' }}
          >
            Carrinho vazio
          </h2>
          <p
            className="mb-6"
            style={{ color: 'var(--cardapio-text-secondary)' }}
          >
            Adicione produtos ao carrinho para continuar
          </p>
          <button
            onClick={() => router.push(`/cardapio/mesa/${mesaId}/cardapio`)}
            className="px-6 py-3 rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--cardapio-btn-primary)',
              color: 'var(--cardapio-btn-primary-text)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-hover)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-primary)'
            }}
          >
            Ver Cardápio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de Itens */}
            <div className="lg:col-span-2 space-y-4">
          <h2
            className="text-xl font-bold mb-4"
            style={{ color: 'var(--cardapio-text-primary)' }}
          >
            Itens do Pedido
          </h2>
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
                onEditar={() => handleEditarItem(item)}
              />
            </div>
          ))}
        </div>

        {/* Resumo Fixo */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl shadow-lg p-6 sticky top-24"
            style={{ backgroundColor: 'var(--cardapio-card-bg)' }}
          >
            <h2
              className="text-xl font-bold mb-4"
              style={{ color: 'var(--cardapio-text-primary)' }}
            >
              Resumo
            </h2>

            <div className="space-y-3 mb-6">
              <div
                className="flex justify-between"
                style={{ color: 'var(--cardapio-text-secondary)' }}
              >
                <span>Subtotal</span>
                <span className="font-semibold">{formatarPreco(carrinho.subtotal)}</span>
              </div>
              <div
                className="pt-3"
                style={{ borderTop: '1px solid var(--cardapio-border)' }}
              >
                <div className="flex justify-between items-center">
                  <span
                    className="text-lg font-bold"
                    style={{ color: 'var(--cardapio-text-primary)' }}
                  >
                    Total
                  </span>
                  <span
                    className="text-2xl font-bold"
                    style={{ color: 'var(--cardapio-accent-primary)' }}
                  >
                    {formatarPreco(carrinho.total)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleEnviarPedido}
              disabled={enviando || carrinho.itens.length === 0}
              className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--cardapio-btn-primary)',
                color: 'var(--cardapio-btn-primary-text)',
              }}
              onMouseEnter={(e) => {
                if (!enviando && carrinho.itens.length > 0) {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (!enviando && carrinho.itens.length > 0) {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-primary)'
                }
              }}
            >
              {enviando ? (
                <>
                  <div
                    className="animate-spin rounded-full h-5 w-5 border-b-2"
                    style={{ borderColor: 'var(--cardapio-btn-primary-text)' }}
                  ></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <MdSend className="w-5 h-5" />
                  <span>Enviar para Cozinha</span>
                </>
              )}
            </button>

            <p
              className="text-xs text-center mt-4"
              style={{ color: 'var(--cardapio-text-tertiary)' }}
            >
              {carrinho.totalItens} {carrinho.totalItens === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Configuração do Produto */}
      {produtoSelecionado && itemEditandoId && (
        <ProdutoConfiguracaoModal
          produto={produtoSelecionado}
          mesaId={mesaId}
          onClose={() => {
            setProdutoSelecionado(null)
            setItemEditandoId(null)
          }}
          onAdicionado={handleProdutoAdicionado}
          itemCarrinho={itemCarrinhoMemo}
        />
      )}
    </div>
  )
}
