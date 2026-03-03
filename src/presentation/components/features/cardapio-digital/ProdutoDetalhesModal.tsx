'use client'

import { Fragment, useState } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import Image from 'next/image'
import { MdClose, MdAdd, MdRemove } from 'react-icons/md'
import { adicionarItemCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { showToast } from '@/src/shared/utils/toast'

interface ProdutoDetalhesModalProps {
  produto: Produto
  mesaId: string
  onClose: () => void
}

/**
 * Modal premium de detalhes do produto
 * Exibe informações completas e permite adicionar ao carrinho
 */
export default function ProdutoDetalhesModal({
  produto,
  mesaId,
  onClose,
}: ProdutoDetalhesModalProps) {
  const [quantidade, setQuantidade] = useState(1)
  const [observacoes, setObservacoes] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  const nome = produto.getNome()
  const valor = produto.getValor()
  const ativo = produto.isAtivo()
  
  // Por enquanto, descricao e imagemUrl não estão na entidade
  const descricao = undefined // produto.getDescricao?.() || undefined
  const imagemUrl = undefined // produto.getImagemUrl?.() || undefined
  
  const valorTotal = valor * quantidade

  const handleAdicionarAoCarrinho = async () => {
    if (!ativo) {
      showToast.error('Produto indisponível')
      return
    }

    setAdicionando(true)
    try {
      const sessionId = sessionStorage.getItem('cardapio_session_token') || mesaId
      
      // Salvar dados do produto no cache para o carrinho usar
      const produtoCache = {
        nome: produto.getNome(),
        valor: produto.getValor(),
        imagemUrl: undefined, // Quando backend estiver pronto, virá aqui
      }
      localStorage.setItem(`produto_cache_${produto.getId()}`, JSON.stringify(produtoCache))
      
      await adicionarItemCarrinho(sessionId, produto.getId(), quantidade, [], observacoes)
      showToast.success('Produto adicionado ao carrinho!')
      onClose()
    } catch (error) {
      showToast.error('Erro ao adicionar produto ao carrinho')
      console.error('Erro:', error)
    } finally {
      setAdicionando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header com imagem */}
        <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
          {imagemUrl ? (
            <Image
              src={imagemUrl}
              alt={nome}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 bg-gray-300 rounded-full flex items-center justify-center">
                <svg
                  className="w-16 h-16 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          )}

          {/* Botão fechar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full p-2 hover:bg-white transition-colors shadow-lg"
          >
            <MdClose className="w-6 h-6 text-gray-700" />
          </button>

          {/* Badge de disponibilidade */}
          {!ativo && (
            <div className="absolute top-4 left-4 bg-gray-800/80 text-white px-4 py-2 rounded-full text-sm font-semibold">
              Indisponível
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Nome e Preço */}
          <div className="mb-4">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{nome}</h2>
            <div className="text-3xl font-bold text-primary">{formatarPreco(valor)}</div>
          </div>

          {/* Descrição */}
          {descricao && (
            <div className="mb-6">
              <p className="text-gray-700 leading-relaxed">{descricao}</p>
            </div>
          )}

          {/* Quantidade */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantidade</label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
                disabled={quantidade <= 1}
              >
                <MdRemove className="w-6 h-6 text-gray-700" />
              </button>
              <span className="text-2xl font-bold text-gray-900 w-12 text-center">{quantidade}</span>
              <button
                onClick={() => setQuantidade(quantidade + 1)}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <MdAdd className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Observações */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Sem cebola, bem passado..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Total */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-700">Total</span>
              <span className="text-2xl font-bold text-primary">{formatarPreco(valorTotal)}</span>
            </div>
          </div>

          {/* Botão Adicionar */}
          <button
            onClick={handleAdicionarAoCarrinho}
            disabled={!ativo || adicionando}
            className="w-full bg-primary text-white py-4 px-6 rounded-xl font-semibold text-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-transform"
          >
            {adicionando ? 'Adicionando...' : 'Adicionar ao Carrinho'}
          </button>
        </div>
      </div>
    </div>
  )
}
