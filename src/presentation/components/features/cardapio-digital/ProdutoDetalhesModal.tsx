'use client'

import { Fragment, useState } from 'react'
import { Produto } from '@/src/domain/entities/Produto'
import Image from 'next/image'
import { MdClose, MdAdd, MdRemove } from 'react-icons/md'
import { adicionarItemCarrinho } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { showToast } from '@/src/shared/utils/toast'
import { getProdutoImagem } from '@/src/presentation/utils/produtoImagens'

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
  const descricao = produto.getDescricao()
  
  // Busca a imagem do produto: primeiro tenta do backend, depois do mapeamento manual
  const imagemUrlBackend = undefined // produto.getImagemUrl?.() || undefined (quando backend estiver pronto)
  const imagemUrl = getProdutoImagem(produto.getId(), imagemUrlBackend)
  
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
        imagemUrl: imagemUrl, // Usa a imagem do mapeamento ou do backend
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
      <div
        className="rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        style={{ backgroundColor: 'var(--cardapio-card-bg)' }}
      >
        {/* Header com imagem */}
        <div
          className="relative h-64"
          style={{
            background: 'linear-gradient(to bottom right, var(--cardapio-bg-secondary), var(--cardapio-bg-tertiary))',
          }}
        >
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
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--cardapio-bg-tertiary)' }}
              >
                <svg
                  className="w-16 h-16"
                  style={{ color: 'var(--cardapio-text-tertiary)' }}
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
            className="absolute top-4 right-4 backdrop-blur-sm rounded-full p-2 transition-colors shadow-lg"
            style={{
              backgroundColor: 'var(--cardapio-bg-elevated)',
              opacity: 0.9,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-elevated)'
              e.currentTarget.style.opacity = '1'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-elevated)'
              e.currentTarget.style.opacity = '0.9'
            }}
          >
            <MdClose
              className="w-6 h-6"
              style={{ color: 'var(--cardapio-text-secondary)' }}
            />
          </button>

          {/* Badge de disponibilidade */}
          {!ativo && (
            <div
              className="absolute top-4 left-4 px-4 py-2 rounded-full text-sm font-semibold"
              style={{
                backgroundColor: 'var(--cardapio-accent-error)',
                color: 'var(--cardapio-btn-primary-text)',
                opacity: 0.9,
              }}
            >
              Indisponível
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          {/* Nome e Preço */}
          <div className="mb-4">
            <h2
              className="text-3xl font-bold mb-2"
              style={{ color: 'var(--cardapio-text-primary)' }}
            >
              {nome}
            </h2>
            <div
              className="text-3xl font-bold"
              style={{ color: 'var(--cardapio-accent-primary)' }}
            >
              {formatarPreco(valor)}
            </div>
          </div>

          {/* Descrição */}
          {descricao && (
            <div className="mb-6">
              <p
                className="leading-relaxed"
                style={{ color: 'var(--cardapio-text-secondary)' }}
              >
                {descricao}
              </p>
            </div>
          )}

          {/* Quantidade */}
          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: 'var(--cardapio-text-secondary)' }}
            >
              Quantidade
            </label>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                className="rounded-full p-2 transition-colors"
                style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                }}
                disabled={quantidade <= 1}
              >
                <MdRemove
                  className="w-6 h-6"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                />
              </button>
              <span
                className="text-2xl font-bold w-12 text-center"
                style={{ color: 'var(--cardapio-text-primary)' }}
              >
                {quantidade}
              </span>
              <button
                onClick={() => setQuantidade(quantidade + 1)}
                className="rounded-full p-2 transition-colors"
                style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                }}
              >
                <MdAdd
                  className="w-6 h-6"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                />
              </button>
            </div>
          </div>

          {/* Observações */}
          <div className="mb-6">
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: 'var(--cardapio-text-secondary)' }}
            >
              Observações (opcional)
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: Sem cebola, bem passado..."
              className="w-full px-4 py-3 rounded-lg resize-none transition-colors"
              style={{
                backgroundColor: 'var(--cardapio-bg-secondary)',
                borderColor: 'var(--cardapio-border)',
                color: 'var(--cardapio-text-primary)',
                borderWidth: '1px',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--cardapio-accent-primary)'
                e.currentTarget.style.outline = 'none'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--cardapio-border)'
              }}
              rows={3}
            />
          </div>

          {/* Total */}
          <div
            className="mb-6 p-4 rounded-lg"
            style={{ backgroundColor: 'var(--cardapio-bg-secondary)' }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-lg font-semibold"
                style={{ color: 'var(--cardapio-text-secondary)' }}
              >
                Total
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color: 'var(--cardapio-accent-primary)' }}
              >
                {formatarPreco(valorTotal)}
              </span>
            </div>
          </div>

          {/* Botão Adicionar */}
          <button
            onClick={handleAdicionarAoCarrinho}
            disabled={!ativo || adicionando}
            className="w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105"
            style={{
              backgroundColor: 'var(--cardapio-btn-primary)',
              color: 'var(--cardapio-btn-primary-text)',
            }}
            onMouseEnter={(e) => {
              if (!ativo || adicionando) return
              e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-hover)'
            }}
            onMouseLeave={(e) => {
              if (!ativo || adicionando) return
              e.currentTarget.style.backgroundColor = 'var(--cardapio-btn-primary)'
            }}
          >
            {adicionando ? 'Adicionando...' : 'Adicionar ao Carrinho'}
          </button>
        </div>
      </div>
    </div>
  )
}
