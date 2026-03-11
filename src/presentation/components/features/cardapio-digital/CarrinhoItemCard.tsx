'use client'

import Image from 'next/image'
import { CarrinhoItem } from '@/src/infrastructure/api/cardapio/cardapioApiService'
import { MdAdd, MdRemove, MdDelete } from 'react-icons/md'

interface CarrinhoItemCardProps {
  item: CarrinhoItem
  onModificarQuantidade: (novaQuantidade: number) => void
  onRemover: () => void
  onEditar?: () => void
}

/**
 * Card de item do carrinho
 * Permite modificar quantidade e remover
 */
export default function CarrinhoItemCard({
  item,
  onModificarQuantidade,
  onRemover,
  onEditar,
}: CarrinhoItemCardProps) {
  const formatarPreco = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor)
  }

  // Calcular valor base do produto (sem complementos)
  // O valorUnitario já inclui os complementos por unidade do produto
  // valorAdicional é calculado como: complemento.getValor() * quantidadeComplemento
  // e representa o valor adicional por unidade do produto (já que cada unidade pode ter aquela quantidade do complemento)
  const calcularValorBase = (): number => {
    let valorComplementosAdicionados = 0
    let valorComplementosRemovidos = 0
    
    // Soma valores dos complementos adicionados (apenas os que aumentam o preço)
    // valorAdicional já é o valor adicional por unidade do produto
    if (item.complementos && item.complementos.length > 0) {
      valorComplementosAdicionados = item.complementos.reduce((sum: number, comp: any) => {
        const tipoImpacto = comp.tipoImpactoPreco
        // Soma apenas se for "aumenta" ou "nenhum"
        if (tipoImpacto === 'aumenta' || tipoImpacto === 'nenhum' || !tipoImpacto) {
          // valorAdicional já é por unidade do produto
          return sum + (comp.valorAdicional || 0)
        }
        return sum
      }, 0)
    }
    
    // Subtrai valores dos complementos removidos (apenas os que diminuem o preço)
    // valor é o valor unitário do complemento, multiplicamos pela quantidade do complemento
    // para obter o valor removido por unidade do produto
    if (item.complementosRemovidos && item.complementosRemovidos.length > 0) {
      valorComplementosRemovidos = item.complementosRemovidos.reduce((sum: number, comp: any) => {
        const tipoImpacto = comp.tipoImpactoPreco
        // Subtrai apenas se for "diminui"
        if (tipoImpacto === 'diminui') {
          // valor é o valor unitário do complemento, multiplicamos pela quantidade do complemento
          // para obter o valor removido por unidade do produto
          return sum + ((comp.valor || 0) * (comp.quantidade || 1))
        }
        return sum
      }, 0)
    }
    
    // O valorUnitario já inclui os complementos por unidade, então subtraímos os adicionados e somamos os removidos
    // para obter o valor base do produto (sem complementos)
    return item.valorUnitario - valorComplementosAdicionados + valorComplementosRemovidos
  }

  const valorBase = calcularValorBase()

  return (
    <div
      className="rounded-2xl shadow-md hover:shadow-lg transition-shadow p-4 cursor-pointer"
      style={{ backgroundColor: 'var(--cardapio-card-bg)' }}
      onClick={(e) => {
        // Não acionar se clicar nos botões de controle
        if (
          (e.target as HTMLElement).closest('button') ||
          (e.target as HTMLElement).closest('svg') ||
          (e.target as HTMLElement).tagName === 'BUTTON' ||
          (e.target as HTMLElement).tagName === 'svg'
        ) {
          return
        }
        onEditar?.()
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div className="flex gap-4">
        {/* Imagem do Produto */}
        <div
          className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0"
          style={{
            background: 'linear-gradient(to bottom right, var(--cardapio-bg-secondary), var(--cardapio-bg-tertiary))',
          }}
        >
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
                className="w-8 h-8"
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
          )}
        </div>

        {/* Informações */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3
              className="text-lg font-semibold truncate"
              style={{ color: 'var(--cardapio-text-primary)' }}
            >
              {item.produtoNome}
            </h3>
            <span
              className="text-base font-semibold flex-shrink-0"
              style={{ color: 'var(--cardapio-accent-primary)' }}
            >
              {formatarPreco(valorBase)}
            </span>
          </div>

          {/* Complementos - 2 Colunas: Retirar | Acrescentar */}
          {(item.complementosRemovidos && item.complementosRemovidos.length > 0) ||
          (item.complementos && item.complementos.length > 0) ? (
            <div className="mb-2">
              <div className="grid grid-cols-2 gap-4 text-xs">
                {/* Coluna Esquerda - Retirar */}
                <div>
                  <p
                    className="font-semibold mb-1"
                    style={{ color: 'var(--cardapio-accent-error)' }}
                  >
                    Retirar:
                  </p>
                  {item.complementosRemovidos && item.complementosRemovidos.length > 0 ? (
                    <div className="space-y-0.5">
                      {item.complementosRemovidos.map((comp: any, index: number) => {
                        const nome = comp.complementoNome || comp.nome || 'Complemento'
                        const valor = comp.valor || 0
                        return (
                          <p
                            key={index}
                            style={{ color: 'var(--cardapio-text-secondary)' }}
                          >
                            {nome} {formatarPreco(valor)}
                          </p>
                        )
                      })}
                    </div>
                  ) : (
                    <p
                      className="italic text-xs"
                      style={{ color: 'var(--cardapio-text-tertiary)' }}
                    >
                      -
                    </p>
                  )}
                </div>

                {/* Coluna Direita - Acrescentar */}
                <div>
                  <p
                    className="font-semibold mb-1"
                    style={{ color: 'var(--cardapio-accent-success)' }}
                  >
                    Acrescentar:
                  </p>
                  {item.complementos && item.complementos.length > 0 ? (
                    <div className="space-y-0.5">
                      {item.complementos.map((comp: any, index: number) => {
                        const nome = comp.complementoNome || comp.nome || 'Complemento'
                        const quantidade = comp.quantidade || 1
                        const valorAdicional = comp.valorAdicional || 0
                        return (
                          <p
                            key={index}
                            style={{ color: 'var(--cardapio-text-secondary)' }}
                          >
                            {quantidade}x - {nome} {formatarPreco(valorAdicional)}
                          </p>
                        )
                      })}
                    </div>
                  ) : (
                    <p
                      className="italic text-xs"
                      style={{ color: 'var(--cardapio-text-tertiary)' }}
                    >
                      -
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Observações */}
          {item.observacoes && (
            <div className="mb-2">
              <p
                className="text-xs font-semibold mb-1"
                style={{ color: 'var(--cardapio-text-secondary)' }}
              >
                Observação:
              </p>
              <p
                className="text-xs italic"
                style={{ color: 'var(--cardapio-text-tertiary)' }}
              >
                "{item.observacoes}"
              </p>
            </div>
          )}

          {/* Controles */}
          <div className="flex items-center justify-between">
            {/* Controle de Quantidade */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => onModificarQuantidade(item.quantidade - 1)}
                className="rounded-full p-2 transition-colors"
                style={{ backgroundColor: 'var(--cardapio-bg-hover)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-tertiary)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                }}
              >
                <MdRemove
                  className="w-5 h-5"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                />
              </button>
              <span
                className="text-lg font-bold w-8 text-center"
                style={{ color: 'var(--cardapio-text-primary)' }}
              >
                {item.quantidade}
              </span>
              <button
                onClick={() => onModificarQuantidade(item.quantidade + 1)}
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
                  className="w-5 h-5"
                  style={{ color: 'var(--cardapio-text-secondary)' }}
                />
              </button>
            </div>

            {/* Total e Remover */}
            <div className="flex items-center gap-4">
              <span
                className="text-xl font-bold"
                style={{ color: 'var(--cardapio-accent-primary)' }}
              >
                {formatarPreco(item.valorTotal)}
              </span>
              <button
                onClick={onRemover}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--cardapio-accent-error)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--cardapio-bg-hover)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
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
