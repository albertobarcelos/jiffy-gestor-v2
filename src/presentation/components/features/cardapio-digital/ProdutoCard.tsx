'use client'

import Image from 'next/image'
import { Produto } from '@/src/domain/entities/Produto'
import { MdAdd, MdInfo } from 'react-icons/md'

interface ProdutoCardProps {
  produto: Produto
  onDetalhes: () => void
}

/**
 * Card premium de produto
 * Design elegante com imagem, nome, descrição e preço
 */
export default function ProdutoCard({ produto, onDetalhes }: ProdutoCardProps) {
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
  // Quando backend estiver pronto, esses campos virão no JSON
  const descricao = undefined // produto.getDescricao?.() || undefined
  const imagemUrl = undefined // produto.getImagemUrl?.() || undefined

  return (
    <div
      className="group bg-white rounded-2xl shadow-md hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden flex flex-col"
      onClick={onDetalhes}
    >
      {/* Imagem do Produto */}
      <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {imagemUrl ? (
          <Image
            src={imagemUrl}
            alt={nome}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-500"
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

        {/* Overlay no hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />

        {/* Badge de disponibilidade */}
        {!ativo && (
          <div className="absolute top-3 right-3 bg-gray-800/80 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Indisponível
          </div>
        )}

        {/* Botão de informações */}
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
            <MdInfo className="w-5 h-5 text-gray-700" />
          </div>
        </div>
      </div>

      {/* Informações do Produto */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{nome}</h3>

        {descricao && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">{descricao}</p>
        )}

        {/* Preço e Ação */}
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
          <div>
            <span className="text-2xl font-bold text-primary">{formatarPreco(valor)}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onDetalhes()
            }}
            className="bg-primary text-white rounded-full p-3 hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg transform hover:scale-110"
            disabled={!ativo}
          >
            <MdAdd className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  )
}
