'use client'

import { DropdownMenu, DropdownMenuItem } from '@/src/presentation/components/ui/dropdown-menu'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import {
  MdAdd,
  MdClear,
  MdDelete,
  MdEdit,
  MdLaunch,
  MdMoreVert,
  MdRemove,
} from 'react-icons/md'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoUIContext'

export function PedidoProdutosCarrinhoColuna() {
  const {
    abrirModalComplementosProdutoExistente,
    abrirModalEdicaoProduto,
    atualizarComplemento,
    atualizarProduto,
    calcularTotalProduto,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    formatarValorComplemento,
    produtos,
    removerComplemento,
    removerProduto,
    setValoresEmEdicao,
    totalProdutos,
    valoresEmEdicao,
  } = useNovoPedidoFormContext()
  const {
    longPressComplementoIndexRef,
    longPressComplementoTimeoutRef,
    longPressIndexRef,
    longPressTimeoutRef,
  } = useNovoPedidoUIContext()

  return (
    <div className="flex min-h-0 min-w-0 flex-[5] basis-0 flex-col gap-2">
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border bg-gray-50">
      {produtos.length > 0 ? (
        <div className="p-2">
          {/* Cabeçalho da tabela */}
          <div className="mb-2 flex gap-2 border-b border-gray-300 pb-2">
            <div className="flex w-[72px] flex-shrink-0 items-center justify-center">
              <span className="text-center text-xs font-semibold text-gray-700">
                Qtd
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-semibold text-gray-700">Produto</span>
            </div>
            <div className="w-20 shrink-0">
              <span className="block text-right text-xs font-semibold text-gray-700">
                Desc./Acres.
              </span>
            </div>
            <div className="w-24 shrink-0">
              <span className="block text-right text-xs font-semibold text-gray-700">
                Val Unit.
              </span>
            </div>
            <div className="w-24 shrink-0">
              <span className="block text-right text-xs font-semibold text-gray-700">
                Total
              </span>
            </div>
            <div className="flex w-[44px] flex-shrink-0 items-center justify-end">
              <span className="text-xs font-semibold text-gray-700">Ações</span>
            </div>
          </div>
          {/* Linhas de produtos */}
          <div className="space-y-1">
            {produtos.map((produto: any, index: number) => {
              // calcularTotalProduto já inclui complementos e desconto/acréscimo
              const totalProdutoComComplementos = calcularTotalProduto(produto)
              const qtdProdKey = `qtd-prod-${index}`

              return (
                <div key={index} className="space-y-0">
                  {/* Linha do Produto Principal */}
                  <div
                    className={`flex items-center gap-1 rounded ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } cursor-pointer hover:bg-gray-100`}
                    onMouseDown={e => {
                      // Iniciar long press apenas se não for em um input ou button
                      const target = e.target as HTMLElement
                      if (
                        target.tagName === 'INPUT' ||
                        target.tagName === 'BUTTON' ||
                        target.closest('button') ||
                        target.closest('input')
                      ) {
                        return
                      }

                      longPressIndexRef.current = index
                      longPressTimeoutRef.current = setTimeout(() => {
                        if (longPressIndexRef.current === index) {
                          void abrirModalEdicaoProduto(index)
                        }
                      }, 800) // 800ms para long press
                    }}
                    onMouseUp={() => {
                      // Limpar timeout se soltar antes do tempo
                      if (longPressTimeoutRef.current) {
                        clearTimeout(longPressTimeoutRef.current)
                        longPressTimeoutRef.current = null
                      }
                      longPressIndexRef.current = null
                    }}
                    onMouseLeave={() => {
                      // Limpar timeout se sair da área
                      if (longPressTimeoutRef.current) {
                        clearTimeout(longPressTimeoutRef.current)
                        longPressTimeoutRef.current = null
                      }
                      longPressIndexRef.current = null
                    }}
                  >
                    {/* Quantidade */}
                    <div className="flex w-[72px] flex-shrink-0 items-center justify-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        disabled={Math.floor(produto.quantidade) <= 1}
                        onClick={e => {
                          e.stopPropagation()
                          const qtdAtual = Math.floor(produto.quantidade)
                          atualizarProduto(index, 'quantidade', Math.max(1, qtdAtual - 1))
                          setValoresEmEdicao((prev: Record<string | number, string>) => {
                            const next = { ...prev }
                            delete next[qtdProdKey]
                            return next
                          })
                        }}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MdRemove className="h-3 w-3" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        aria-label="Quantidade"
                        value={
                          valoresEmEdicao[qtdProdKey] !== undefined
                            ? valoresEmEdicao[qtdProdKey]
                            : String(Math.floor(produto.quantidade))
                        }
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation()
                          const digits = e.target.value.replace(/\D/g, '')
                          setValoresEmEdicao((prev: Record<string | number, string>) => ({
                            ...prev,
                            [qtdProdKey]: digits,
                          }))
                          if (digits !== '') {
                            const valor = parseInt(digits, 10)
                            if (Number.isFinite(valor) && valor >= 1) {
                              atualizarProduto(index, 'quantidade', valor)
                            }
                          }
                        }}
                        onFocus={e => {
                          e.stopPropagation()
                          setValoresEmEdicao((prev: Record<string | number, string>) => ({
                            ...prev,
                            [qtdProdKey]: String(Math.floor(produto.quantidade)),
                          }))
                          setTimeout(() => e.target.select(), 0)
                        }}
                        onBlur={e => {
                          e.stopPropagation()
                          const digits = e.target.value.replace(/\D/g, '')
                          const valor = parseInt(digits, 10)
                          const qtdFinal =
                            Number.isFinite(valor) && valor >= 1 ? valor : 1
                          atualizarProduto(index, 'quantidade', qtdFinal)
                          setValoresEmEdicao((prev: Record<string | number, string>) => {
                            const next = { ...prev }
                            delete next[qtdProdKey]
                            return next
                          })
                        }}
                        onKeyDown={e => {
                          e.stopPropagation()
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                        className="h-5 w-6 min-w-0 border-0 bg-transparent p-0 text-center text-xs tabular-nums text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        onClick={e => {
                          e.stopPropagation()
                          const qtdAtual = Math.floor(produto.quantidade)
                          atualizarProduto(index, 'quantidade', qtdAtual + 1)
                          setValoresEmEdicao((prev: Record<string | number, string>) => {
                            const next = { ...prev }
                            delete next[qtdProdKey]
                            return next
                          })
                        }}
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100"
                      >
                        <MdAdd className="h-3 w-3" />
                      </button>
                    </div>
                    {/* Nome do Produto */}
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-xs text-gray-900">
                        {produto.nome}
                      </span>
                    </div>
                    {/* Desconto/Acréscimo */}
                    <div className="w-20 shrink-0">
                      <span className="block truncate text-right text-xs text-gray-600">
                        {formatarDescontoAcrescimo(produto)}
                      </span>
                    </div>
                    {/* Valor Unitário */}
                    <div className="w-24 shrink-0">
                      <input
                        type="text"
                        value={
                          valoresEmEdicao[index] !== undefined
                            ? valoresEmEdicao[index]
                            : produto.valorUnitario > 0
                              ? formatarNumeroComMilhar(produto.valorUnitario)
                              : ''
                        }
                        onChange={e => {
                          let valorStr = e.target.value

                          // Se vazio, limpa o campo
                          if (valorStr === '') {
                            setValoresEmEdicao((prev: any) => ({ ...prev, [index]: '' }))
                            atualizarProduto(index, 'valorUnitario', 0)
                            return
                          }

                          // Remove pontos (separadores de milhar) e vírgula, mantém apenas números
                          valorStr = valorStr
                            .replace(/\./g, '')
                            .replace(',', '')
                            .replace(/\D/g, '')

                          // Se vazio após limpeza, limpa o campo
                          if (valorStr === '') {
                            setValoresEmEdicao((prev: any) => ({ ...prev, [index]: '' }))
                            atualizarProduto(index, 'valorUnitario', 0)
                            return
                          }

                          // Converte para número (centavos) e divide por 100 para obter reais
                          const valorCentavos = parseInt(valorStr, 10)
                          const valorReais = valorCentavos / 100

                          // Formata com separadores de milhar
                          const valorFormatado = formatarNumeroComMilhar(valorReais)

                          // Atualiza o estado de edição com o valor formatado
                          setValoresEmEdicao((prev: any) => ({
                            ...prev,
                            [index]: valorFormatado,
                          }))

                          // Atualiza o valor do produto
                          atualizarProduto(index, 'valorUnitario', valorReais)
                        }}
                        onFocus={e => {
                          // Ao focar, mantém o valor formatado (ex: "8,00" ou "1.000.000,00")
                          const valorAtual = produto.valorUnitario
                          if (valorAtual > 0) {
                            const valorFormatado = formatarNumeroComMilhar(valorAtual)
                            setValoresEmEdicao((prev: any) => ({
                              ...prev,
                              [index]: valorFormatado,
                            }))
                          } else {
                            setValoresEmEdicao((prev: any) => ({ ...prev, [index]: '' }))
                          }
                          // Seleciona todo o texto para facilitar substituição
                          setTimeout(() => e.target.select(), 0)
                        }}
                        onBlur={e => {
                          // Garante formatação correta ao perder o foco
                          const valor = produto.valorUnitario
                          if (valor > 0) {
                            const valorFormatado = formatarNumeroComMilhar(valor)
                            setValoresEmEdicao((prev: any) => ({
                              ...prev,
                              [index]: valorFormatado,
                            }))
                            // Remove do estado após um pequeno delay para mostrar formato final
                            setTimeout(() => {
                              setValoresEmEdicao((prev: any) => {
                                const novo = { ...prev }
                                delete novo[index]
                                return novo
                              })
                            }, 100)
                          } else {
                            // Remove do estado se vazio
                            setValoresEmEdicao((prev: any) => {
                              const novo = { ...prev }
                              delete novo[index]
                              return novo
                            })
                          }
                        }}
                        placeholder="0,00"
                        style={{
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none',
                          appearance: 'none',
                        }}
                        className="h-7 w-full border-0 bg-transparent p-1 text-right text-xs focus:bg-white focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    {/* Total */}
                    <div className="w-24 shrink-0">
                      <span className="block text-right text-xs font-semibold text-gray-900">
                        R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
                      </span>
                    </div>
                    {/* Ações: menu compacto + remover */}
                    <div
                      className="flex w-[44px] shrink-0 items-center justify-end gap-0"
                      role="group"
                      aria-label="Ações do produto"
                      onClick={e => e.stopPropagation()}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <DropdownMenu
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                        trigger={
                          <button
                            type="button"
                            aria-label="Mais ações do produto"
                            className="flex h-5 w-4 shrink-0 items-center justify-center rounded border-0 p-0 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
                          >
                            <MdMoreVert className="h-4 w-4" />
                          </button>
                        }
                      >
                        <DropdownMenuItem
                          icon={<MdEdit className="h-4 w-4 text-primary" />}
                          onClick={() => void abrirModalEdicaoProduto(index)}
                        >
                          <span className="text-xs">Editar produto</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          icon={<MdLaunch className="h-4 w-4 text-primary" />}
                          onClick={() =>
                            void abrirModalComplementosProdutoExistente(index)
                          }
                        >
                          <span className="text-xs">Editar complementos</span>
                        </DropdownMenuItem>
                      </DropdownMenu>
                      <button
                        onClick={() => removerProduto(index)}
                        type="button"
                        title="Remover produto"
                        aria-label="Remover produto"
                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-100"
                      >
                        <MdDelete className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {/* Linhas dos Complementos */}
                  {produto.complementos.map((complemento: any, compIndex: number) => {
                    const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
                    const qtdCompKey = `qtd-${compKey}`

                    return (
                      <div
                        key={compKey}
                        className={`-mt-0.5 flex items-center gap-1 rounded ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } cursor-pointer hover:bg-gray-100`}
                        style={{ minHeight: '24px' }}
                        onMouseDown={e => {
                          // Iniciar long press apenas se não for em um input ou button
                          const target = e.target as HTMLElement
                          if (
                            target.tagName === 'INPUT' ||
                            target.tagName === 'BUTTON' ||
                            target.closest('button') ||
                            target.closest('input')
                          ) {
                            return
                          }

                          longPressComplementoIndexRef.current = index
                          longPressComplementoTimeoutRef.current = setTimeout(() => {
                            if (longPressComplementoIndexRef.current === index) {
                              void abrirModalComplementosProdutoExistente(index)
                            }
                          }, 800) // 800ms para long press
                        }}
                        onMouseUp={() => {
                          // Limpar timeout se soltar antes do tempo
                          if (longPressComplementoTimeoutRef.current) {
                            clearTimeout(longPressComplementoTimeoutRef.current)
                            longPressComplementoTimeoutRef.current = null
                          }
                          longPressComplementoIndexRef.current = null
                        }}
                        onMouseLeave={() => {
                          // Limpar timeout se sair da área
                          if (longPressComplementoTimeoutRef.current) {
                            clearTimeout(longPressComplementoTimeoutRef.current)
                            longPressComplementoTimeoutRef.current = null
                          }
                          longPressComplementoIndexRef.current = null
                        }}
                      >
                        {/* Quantidade do Complemento */}
                        <div className="flex w-[72px] flex-shrink-0 items-center justify-center gap-0.5 pl-2">
                          <button
                            type="button"
                            aria-label="Diminuir quantidade do complemento"
                            disabled={Math.floor(complemento.quantidade) <= 1}
                            onClick={e => {
                              e.stopPropagation()
                              const qtdAtual = Math.floor(complemento.quantidade)
                              atualizarComplemento(
                                index,
                                compIndex,
                                'quantidade',
                                Math.max(1, qtdAtual - 1)
                              )
                              setValoresEmEdicao((prev: Record<string | number, string>) => {
                                const next = { ...prev }
                                delete next[qtdCompKey]
                                return next
                              })
                            }}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <MdRemove className="h-3 w-3" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label="Quantidade do complemento"
                            value={
                              valoresEmEdicao[qtdCompKey] !== undefined
                                ? valoresEmEdicao[qtdCompKey]
                                : String(Math.floor(complemento.quantidade))
                            }
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              e.stopPropagation()
                              const digits = e.target.value.replace(/\D/g, '')
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [qtdCompKey]: digits,
                              }))
                              if (digits !== '') {
                                const valor = parseInt(digits, 10)
                                if (Number.isFinite(valor) && valor >= 1) {
                                  atualizarComplemento(
                                    index,
                                    compIndex,
                                    'quantidade',
                                    valor
                                  )
                                }
                              }
                            }}
                            onFocus={e => {
                              e.stopPropagation()
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [qtdCompKey]: String(Math.floor(complemento.quantidade)),
                              }))
                              setTimeout(() => e.target.select(), 0)
                            }}
                            onBlur={e => {
                              e.stopPropagation()
                              const digits = e.target.value.replace(/\D/g, '')
                              const valor = parseInt(digits, 10)
                              const qtdFinal =
                                Number.isFinite(valor) && valor >= 1 ? valor : 1
                              atualizarComplemento(
                                index,
                                compIndex,
                                'quantidade',
                                qtdFinal
                              )
                              setValoresEmEdicao((prev: Record<string | number, string>) => {
                                const next = { ...prev }
                                delete next[qtdCompKey]
                                return next
                              })
                            }}
                            onKeyDown={e => {
                              e.stopPropagation()
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            className="h-5 w-6 min-w-0 border-0 bg-transparent p-0 text-center text-xs tabular-nums text-gray-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            aria-label="Aumentar quantidade do complemento"
                            onClick={e => {
                              e.stopPropagation()
                              const qtdAtual = Math.floor(complemento.quantidade)
                              atualizarComplemento(
                                index,
                                compIndex,
                                'quantidade',
                                qtdAtual + 1
                              )
                              setValoresEmEdicao((prev: Record<string | number, string>) => {
                                const next = { ...prev }
                                delete next[qtdCompKey]
                                return next
                              })
                            }}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-colors hover:bg-gray-100"
                          >
                            <MdAdd className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Nome do Complemento com indentação */}
                        <div className="min-w-0 flex-1 pl-4">
                          <span className="block truncate text-xs leading-tight text-gray-600">
                            {complemento.nome}
                          </span>
                        </div>
                        {/* Espaço vazio para Desconto/Acréscimo (complementos não têm) */}
                        <div className="w-20 shrink-0" />
                        {/* Valor Unitário do Complemento - Apenas exibição */}
                        <div className="w-24 shrink-0">
                          <span className="block truncate text-right text-xs leading-tight text-gray-600">
                            {formatarValorComplemento(
                              complemento.valor,
                              complemento.tipoImpactoPreco
                            )}
                          </span>
                        </div>
                        {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                        <div className="w-24 shrink-0" />
                        {/* Ações: alinhado à coluna do produto (espaço do menu + remover) */}
                        <div
                          className="flex w-[44px] shrink-0 items-center justify-end gap-0"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <span className="block h-5 w-5 shrink-0" aria-hidden />
                          <button
                            onClick={() => removerComplemento(index, compIndex)}
                            type="button"
                            title="Remover complemento"
                            aria-label="Remover complemento"
                            className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-50"
                          >
                            <MdClear className="h-3.5 w-3.5 text-red-500" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-gray-500">Nenhum produto selecionado</p>
        </div>
      )}
    </div>

    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 bg-white px-2 py-2">
      <span className="text-sm font-semibold text-gray-700">Total do Pedido:</span>
      <span className="text-lg font-semibold text-primary">
        {transformarParaReal(totalProdutos)}
      </span>
    </div>
    </div>
  )
}
