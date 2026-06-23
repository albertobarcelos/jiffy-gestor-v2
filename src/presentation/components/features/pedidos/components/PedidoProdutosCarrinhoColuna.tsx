'use client'

import { useState } from 'react'
import Image from 'next/image'
import Tooltip from '@mui/material/Tooltip'
import { DropdownMenu, DropdownMenuItem } from '@/src/presentation/components/ui/dropdown-menu'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { produtoPermiteAlterarPreco, obterUnidadeMedidaProdutoLinha } from '../produtoCatalogoHelpers'
import { quantidadeMaximaComplementoNaLinha } from '@/src/domain/policies/pedido/ComplementoQuantidadeLinhaPolicy'
import { produtoPermiteQuantidadeDecimal } from '@/src/shared/types/unidadeMedidaProduto'
import {
  formatarQuantidadeProdutoExibicao,
  incrementarQuantidadeProduto,
  normalizarQuantidadeProduto,
  parseQuantidadeProdutoInput,
  quantidadeProdutoPodeDiminuir,
  sanitizarTextoQuantidadeProdutoEmEdicao,
} from '@/src/shared/utils/quantidadeProdutoInput'
import {
  OBSERVACAO_PEDIDO_MAX_CHARS,
  observacaoTextoParcialInvalido,
} from '@/src/shared/helpers/observacaoPedido'
import { Textarea } from '@/src/presentation/components/ui/textarea'
import {
  MdAdd,
  MdClear,
  MdDelete,
  MdEdit,
  MdLaunch,
  MdMoreVert,
  MdNote,
  MdRemove,
} from 'react-icons/md'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoUIContext'

export function PedidoProdutosCarrinhoColuna() {
  const {
    abrirModalComplementosProdutoExistente,
    abrirModalEdicaoProduto,
    abrirModalObservacaoProduto,
    atualizarComplemento,
    atualizarProduto,
    calcularTotalProduto,
    catalogoProdutosPorId,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    formatarValorComplemento,
    produtos,
    produtosList,
    observacaoPedido,
    setObservacaoPedido,
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

  const [observacaoPedidoVisivel, setObservacaoPedidoVisivel] = useState(
    () => observacaoPedido.trim().length > 0
  )

  return (
    <div className="flex min-h-0 min-w-0 flex-[5] basis-0 flex-col gap-2">
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border bg-gray-50">
      {produtos.length > 0 ? (
        <div className="p-2">
          {/* Cabeçalho da tabela */}
          <div className="mb-2 flex gap-2 border-b border-gray-300 pb-2 items-center">
            <div className="flex w-[66px] flex-shrink-0 items-center justify-center">
              <span className="text-center text-xs font-semibold text-gray-700">
                Qtd
              </span>
            </div>
            <div className="min-w-0 flex-1 items-center">
              <span className="text-xs font-semibold text-gray-700">Produto</span>
            </div>
            <div className="w-16 shrink-0 items-center">
              <span className="block text-right text-xs font-semibold text-gray-700">
                Desc./Acres.
              </span>
            </div>
            <div className="w-20 shrink-0">
              <span className="block text-right text-xs font-semibold text-gray-700">
                Val Unit.
              </span>
            </div>
            <div className="w-20 shrink-0 items-center">
              <span className="block text-right text-xs font-semibold text-gray-700">
                Total
              </span>
            </div>
            <div className="flex w-[22px] flex-shrink-0 items-center justify-end">
              <MdMoreVert className="h-4 w-4 text-gray-700" aria-hidden />
            </div>
          </div>
          {/* Linhas de produtos */}
          <div className="space-y-1">
            {produtos.map((produto: any, index: number) => {
              // calcularTotalProduto já inclui complementos e desconto/acréscimo
              const totalProdutoComComplementos = calcularTotalProduto(produto)
              const qtdProdKey = `qtd-prod-${index}`
              const unidadeMedida = obterUnidadeMedidaProdutoLinha(
                produto,
                catalogoProdutosPorId,
                produtosList
              )
              const qtdProdutoDecimal = produtoPermiteQuantidadeDecimal(unidadeMedida)
              const permiteAlterarPreco = produtoPermiteAlterarPreco(
                produto.produtoId,
                catalogoProdutosPorId,
                produtosList
              )
              const valorUnitarioExibicao =
                produto.valorUnitario > 0
                  ? formatarNumeroComMilhar(produto.valorUnitario)
                  : '0,00'

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
                    <div className="flex w-[66px] flex-shrink-0 items-center justify-center gap-0.5">
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        disabled={!quantidadeProdutoPodeDiminuir(produto.quantidade, unidadeMedida)}
                        onClick={e => {
                          e.stopPropagation()
                          const proxima = incrementarQuantidadeProduto(
                            produto.quantidade,
                            -1,
                            unidadeMedida
                          )
                          atualizarProduto(index, 'quantidade', proxima)
                          setValoresEmEdicao((prev: Record<string | number, string>) => {
                            const next = { ...prev }
                            delete next[qtdProdKey]
                            return next
                          })
                        }}
                        className="flex h-3 w-3 shrink-0 items-center justify-center bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MdRemove className="h-2 w-2" />
                      </button>
                      <input
                        type="text"
                        inputMode={qtdProdutoDecimal ? 'decimal' : 'numeric'}
                        aria-label="Quantidade"
                        value={
                          valoresEmEdicao[qtdProdKey] !== undefined
                            ? valoresEmEdicao[qtdProdKey]
                            : formatarQuantidadeProdutoExibicao(produto.quantidade, unidadeMedida)
                        }
                        onClick={e => e.stopPropagation()}
                        onChange={e => {
                          e.stopPropagation()
                          const texto = sanitizarTextoQuantidadeProdutoEmEdicao(
                            e.target.value,
                            unidadeMedida
                          )
                          setValoresEmEdicao((prev: Record<string | number, string>) => ({
                            ...prev,
                            [qtdProdKey]: texto,
                          }))
                          const parsed = parseQuantidadeProdutoInput(texto, unidadeMedida)
                          if (parsed !== null) {
                            atualizarProduto(
                              index,
                              'quantidade',
                              normalizarQuantidadeProduto(parsed, unidadeMedida)
                            )
                          }
                        }}
                        onFocus={e => {
                          e.stopPropagation()
                          setValoresEmEdicao((prev: Record<string | number, string>) => ({
                            ...prev,
                            [qtdProdKey]: formatarQuantidadeProdutoExibicao(
                              produto.quantidade,
                              unidadeMedida
                            ),
                          }))
                          setTimeout(() => e.target.select(), 0)
                        }}
                        onBlur={e => {
                          e.stopPropagation()
                          const texto =
                            valoresEmEdicao[qtdProdKey] !== undefined
                              ? valoresEmEdicao[qtdProdKey]
                              : e.target.value
                          const parsed = parseQuantidadeProdutoInput(texto, unidadeMedida)
                          const qtdFinal = normalizarQuantidadeProduto(
                            parsed ?? produto.quantidade,
                            unidadeMedida
                          )
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
                        className="h-5 w-5 min-w-0 border-0 bg-transparent p-0 text-center text-xs tabular-nums text-gray-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        onClick={e => {
                          e.stopPropagation()
                          const proxima = incrementarQuantidadeProduto(
                            produto.quantidade,
                            1,
                            unidadeMedida
                          )
                          atualizarProduto(index, 'quantidade', proxima)
                          setValoresEmEdicao((prev: Record<string | number, string>) => {
                            const next = { ...prev }
                            delete next[qtdProdKey]
                            return next
                          })
                        }}
                        className="flex h-3 w-3 shrink-0 items-center justify-center bg-white text-gray-600 transition-colors hover:bg-gray-100"
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
                    <div className="w-16 shrink-0">
                      <span className="block truncate text-right text-xs text-gray-600">
                        {formatarDescontoAcrescimo(produto)}
                      </span>
                    </div>
                    {/* Valor Unitário */}
                    <div className="w-20 shrink-0">
                      {permiteAlterarPreco ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Valor unitário"
                          value={
                            valoresEmEdicao[index] !== undefined
                              ? valoresEmEdicao[index]
                              : produto.valorUnitario > 0
                                ? formatarNumeroComMilhar(produto.valorUnitario)
                                : ''
                          }
                          onClick={e => e.stopPropagation()}
                          onChange={e => {
                            e.stopPropagation()
                            let valorStr = e.target.value

                            if (valorStr === '') {
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [index]: '',
                              }))
                              atualizarProduto(index, 'valorUnitario', 0)
                              return
                            }

                            valorStr = valorStr
                              .replace(/\./g, '')
                              .replace(',', '')
                              .replace(/\D/g, '')

                            if (valorStr === '') {
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [index]: '',
                              }))
                              atualizarProduto(index, 'valorUnitario', 0)
                              return
                            }

                            const valorCentavos = parseInt(valorStr, 10)
                            const valorReais = valorCentavos / 100
                            const valorFormatado = formatarNumeroComMilhar(valorReais)

                            setValoresEmEdicao((prev: Record<string | number, string>) => ({
                              ...prev,
                              [index]: valorFormatado,
                            }))
                            atualizarProduto(index, 'valorUnitario', valorReais)
                          }}
                          onFocus={e => {
                            e.stopPropagation()
                            const valorAtual = produto.valorUnitario
                            if (valorAtual > 0) {
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [index]: formatarNumeroComMilhar(valorAtual),
                              }))
                            } else {
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [index]: '',
                              }))
                            }
                            setTimeout(() => e.target.select(), 0)
                          }}
                          onBlur={e => {
                            e.stopPropagation()
                            const valor = produto.valorUnitario
                            if (valor > 0) {
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [index]: formatarNumeroComMilhar(valor),
                              }))
                              setTimeout(() => {
                                setValoresEmEdicao((prev: Record<string | number, string>) => {
                                  const novo = { ...prev }
                                  delete novo[index]
                                  return novo
                                })
                              }, 100)
                            } else {
                              setValoresEmEdicao((prev: Record<string | number, string>) => {
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
                      ) : (
                        <span className="block truncate p-1 text-right text-xs text-gray-900">
                          {valorUnitarioExibicao}
                        </span>
                      )}
                    </div>
                    {/* Total */}
                    <div className="w-20 shrink-0">
                      <span className="block text-right text-xs font-semibold text-gray-900">
                        R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
                      </span>
                    </div>
                    {/* Ações: menu compacto + remover */}
                    <div
                      className="flex w-[26px] shrink-0 items-center justify-end gap-0"
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
                            className="flex h-5 w-3 shrink-0 items-center justify-center rounded border-0 p-0 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
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
                        <DropdownMenuItem
                          icon={<MdNote className="h-4 w-4 text-primary" />}
                          onClick={() => abrirModalObservacaoProduto(index)}
                        >
                          <span className="text-xs">Observação do item</span>
                        </DropdownMenuItem>
                      </DropdownMenu>
                      <button
                        onClick={() => removerProduto(index)}
                        type="button"
                        title="Remover produto"
                        aria-label="Remover produto"
                        className="flex h-4 w-3 shrink-0 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-100"
                      >
                        <MdDelete className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  </div>

                  {produto.observacao?.trim() ? (
                    <div
                      className={`flex gap-1 rounded pb-0.5 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="w-[72px] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="block break-words text-[11px] leading-tight text-gray-500">
                          Obs: {produto.observacao.trim()}
                        </span>
                      </div>
                      <div className="w-[44px] shrink-0" />
                    </div>
                  ) : null}

                  {/* Linhas dos Complementos */}
                  {produto.complementos.map((complemento: any, compIndex: number) => {
                    const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
                    const qtdCompKey = `qtd-${compKey}`
                    const qtdMaxComp = quantidadeMaximaComplementoNaLinha(
                      produto.quantidade,
                      unidadeMedida
                    )
                    const qtdCompLinha = Math.floor(complemento.quantidade)
                    const complementoQtdTravada = qtdMaxComp !== null
                    const compMaisDesabilitado =
                      complementoQtdTravada || (qtdMaxComp !== null && qtdCompLinha >= qtdMaxComp)
                    const compMenosDesabilitado = complementoQtdTravada || qtdCompLinha <= 1

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
                        <div className="flex w-[66px] flex-shrink-0 items-center justify-center gap-0.5 pl-2">
                          <button
                            type="button"
                            aria-label="Diminuir quantidade do complemento"
                            disabled={compMenosDesabilitado}
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
                            className="flex h-3 w-3 shrink-0 items-center justify-center bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <MdRemove className="h-2 w-2" />
                          </button>
                          <input
                            type="text"
                            inputMode="numeric"
                            aria-label="Quantidade do complemento"
                            readOnly={complementoQtdTravada}
                            value={
                              valoresEmEdicao[qtdCompKey] !== undefined
                                ? valoresEmEdicao[qtdCompKey]
                                : String(Math.floor(complemento.quantidade))
                            }
                            onClick={e => e.stopPropagation()}
                            onChange={e => {
                              if (complementoQtdTravada) return
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
                              if (complementoQtdTravada) return
                              e.stopPropagation()
                              setValoresEmEdicao((prev: Record<string | number, string>) => ({
                                ...prev,
                                [qtdCompKey]: String(Math.floor(complemento.quantidade)),
                              }))
                              setTimeout(() => e.target.select(), 0)
                            }}
                            onBlur={e => {
                              if (complementoQtdTravada) return
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
                            className="h-5 w-5 min-w-0 border-0 bg-transparent p-0 text-center text-xs tabular-nums text-gray-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            aria-label="Aumentar quantidade do complemento"
                            disabled={compMaisDesabilitado}
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
                            className="flex h-3 w-3 shrink-0 items-center justify-center bg-white text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <MdAdd className="h-3 w-3" />
                          </button>
                        </div>
                        {/* Nome do Complemento com indentação */}
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs leading-tight text-gray-600">
                            {complemento.nome}
                          </span>
                        </div>
                       
                        {/* Valor Unitário do Complemento - Apenas exibição */}
                        <div className="w-20 shrink-0">
                          <span className="block truncate text-right text-xs leading-tight text-gray-600">
                            {formatarValorComplemento(
                              complemento.valor,
                              complemento.tipoImpactoPreco
                            )}
                          </span>
                        </div>
                        {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                        <div className="w-20 shrink-0" />
                        {/* Ações: alinhado à coluna do produto (espaço do menu + remover) */}
                        <div
                          className="flex w-[34px] shrink-0 items-center justify-end gap-0"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <span className="block h-5 w-5 shrink-0" aria-hidden />
                          <button
                            onClick={() => removerComplemento(index, compIndex)}
                            type="button"
                            title="Remover complemento"
                            aria-label="Remover complemento"
                            className="flex h-5 w-3 shrink-0 items-center justify-center rounded border-0 p-0 transition-colors hover:bg-red-50"
                          >
                            <MdClear className="h-3 w-3 text-red-500" />
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
        <div className="flex h-full min-h-[200px] items-center justify-center overflow-hidden p-4">
          <div className="flex items-center gap-3">
            <div className="relative h-32 w-28 shrink-0 sm:h-36 sm:w-32">
              <Image
                src="/images/jiffy-acenando.png"
                alt="Jiffy acenando"
                fill
                sizes="128px"
                className="object-contain"
              />
            </div>
            <p className="font-nunito text-base leading-snug text-gray-600">
              Selecione um grupo
              <br />
              e um produto
              <br />
              na lista.
            </p>
          </div>
        </div>
      )}
    </div>

    <div className="flex shrink-0 flex-col gap-2 border-t border-gray-200 bg-white">
      {produtos.length > 0 && observacaoPedidoVisivel ? (
        <div className="px-2 pt-2">
          <Textarea
            label="Observação do pedido"
            placeholder="Instruções gerais para o pedido (opcional)"
            value={observacaoPedido}
            onChange={e => setObservacaoPedido(e.target.value)}
            inputProps={{ maxLength: OBSERVACAO_PEDIDO_MAX_CHARS }}
            error={observacaoTextoParcialInvalido(observacaoPedido)}
            helperText={
              observacaoTextoParcialInvalido(observacaoPedido)
                ? 'Mínimo 3 caracteres (ou deixe vazio).'
                : `${observacaoPedido.length}/${OBSERVACAO_PEDIDO_MAX_CHARS} caracteres`
            }
            rows={2}
          />
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        {produtos.length > 0 &&
          (!observacaoPedidoVisivel || !observacaoPedido.trim()) && (
            <Tooltip
              title={
                observacaoPedidoVisivel
                  ? 'Ocultar observação'
                  : 'Adicionar observação ao pedido'
              }
            >
              <button
                type="button"
                aria-label={
                  observacaoPedidoVisivel
                    ? 'Ocultar observação do pedido'
                    : 'Adicionar observação ao pedido'
                }
                onClick={() => setObservacaoPedidoVisivel(!observacaoPedidoVisivel)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 transition-colors hover:border-primary hover:text-primary"
              >
                {observacaoPedidoVisivel ? (
                  <MdRemove className="h-4 w-4" />
                ) : (
                  <MdAdd className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
          )}
        <div className="flex items-center justify-end gap-2 px-2 py-2">
        <span className="text-sm font-semibold text-gray-700">Total do Pedido:</span>
        <span className="text-lg font-semibold text-primary">
          {transformarParaReal(totalProdutos)}
        </span>
        </div>
      </div>
    </div>
    </div>
  )
}
