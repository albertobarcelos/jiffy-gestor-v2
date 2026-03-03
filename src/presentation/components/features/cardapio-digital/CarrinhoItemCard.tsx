'use client'

import Image from 'next/image'
import { CarrinhoItem } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { MdAdd, MdRemove, MdDelete } from 'react-icons/md'

interface CarrinhoItemCardProps {
  item: CarrinhoItem
  onModificarQuantidade: (novaQuantidade: number) => void
  onRemover: () => void
}

/**
 * Card de item do carrinho
 * Permite modificar quantidade e remover
 */
export default function CarrinhoItemCard({
  item,
  onModificarQuantidade,
  onRemover,
}: CarrinhoItemCardProps) {
  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4">
      <div className="flex gap-4">
        {/* Imagem do Produto */}
        <div className="relative w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden flex-shrink-0">
          {item.produtoImagemUrl ? (
            <Image
              src={item.produtoImagemUrl}
              alt={item.produtoNome}
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
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
          )}
        </div>

        {/* Informações */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1 truncate">
            {item.produtoNome}
          </h3>

          {/* Complementos - 2 Colunas: Retirar | Acrescentar */}
          {(item.complementosRemovidos && item.complementosRemovidos.length > 0) ||
          (item.complementos && item.complementos.length > 0) ? (
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Coluna Esquerda - Retirar */}
                <div>
                  <p className="font-semibold text-red-600 mb-1">Retirar:</p>
                  {item.complementosRemovidos && item.complementosRemovidos.length > 0 ? (
                    <div className="space-y-0.5">
                      {item.complementosRemovidos.map((comp: any, index: number) => {
                        const nome = comp.complementoNome || comp.nome || 'Complemento'
                        const valor = comp.valor || 0
                        return (
                          <p key={index} className="text-gray-600">
                            {nome} {formatarPreco(valor)}
                          </p>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-xs">-</p>
                  )}
                </div>

                {/* Coluna Direita - Acrescentar */}
                <div>
                  <p className="font-semibold text-green-600 mb-1">Acrescentar:</p>
                  {item.complementos && item.complementos.length > 0 ? (
                    <div className="space-y-0.5">
                      {item.complementos.map((comp: any, index: number) => {
                        const nome = comp.complementoNome || comp.nome || 'Complemento'
                        const valorAdicional = comp.valorAdicional || 0
                        return (
                          <p key={index} className="text-gray-600">
                            {nome} {formatarPreco(valorAdicional)}
                          </p>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic text-xs">-</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Observações */}
          {item.observacoes && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-700 mb-1">Observação:</p>
              <p className="text-xs text-gray-500 italic">"{item.observacoes}"</p>
            </div>
          )}

          {/* Controles */}
          <div className="flex items-center justify-between">
            {/* Controle de Quantidade */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onModificarQuantidade(item.quantidade - 1)}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <MdRemove className="w-5 h-5 text-gray-700" />
              </button>
              <span className="text-lg font-bold text-gray-900 w-8 text-center">
                {item.quantidade}
              </span>
              <button
                onClick={() => onModificarQuantidade(item.quantidade + 1)}
                className="bg-gray-100 hover:bg-gray-200 rounded-full p-2 transition-colors"
              >
                <MdAdd className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* Total e Remover */}
            <div className="flex items-center gap-4">
              <span className="text-xl font-bold text-primary">
                {formatarPreco(item.valorTotal)}
              </span>
              <button
                onClick={onRemover}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Remover item"
              >
                <MdDelete className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
