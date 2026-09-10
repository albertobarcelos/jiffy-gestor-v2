'use client'

import { useState, type ReactNode } from 'react'
import Image from 'next/image'
import { DropdownMenu, DropdownMenuItem } from '@/src/presentation/components/ui/dropdown-menu'
import { transformarParaReal } from '@/src/shared/utils/formatters'
import { produtoPermiteAlterarPreco, obterUnidadeMedidaProdutoLinha } from '../produtoCatalogoHelpers'
import { quantidadeMaximaComplementoNaLinha } from '@/src/domain/policies/pedido/ComplementoQuantidadeLinhaPolicy'
import {
  formatarUnidadeMedidaProdutoExibicao,
  produtoPermiteQuantidadeDecimal,
} from '@/src/shared/types/unidadeMedidaProduto'
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
import { JiffyConfirmDialog } from '@/src/presentation/components/ui/jiffy-confirm-dialog'
import { Textarea } from '@/src/presentation/components/ui/textarea'
import {
  MdAdd,
  MdDeleteOutline,
  MdEdit,
  MdLaunch,
  MdMoreHoriz,
  MdNote,
  MdRemove,
} from 'react-icons/md'
import { useNovoPedidoFormContext } from '../context/NovoPedidoFormContext'
import { useNovoPedidoDetalheContext } from '../context/NovoPedidoDetalheContext'
import { useNovoPedidoUIContext } from '../context/NovoPedidoUIContext'

/**
 * Grid compartilhado: Qtd | Produto | Unid. | Desc. | Val Unit. | Total | Ações.
 * Cabeçalho e cada linha são grids independentes, então as larguras precisam ser fixas
 * (não `auto`) para alinharem entre si. As colunas numéricas são dimensionadas para caber
 * os maiores valores sem quebrar (Qtd decimal "0,500", Val Unit. "300.000,00",
 * Total "R$ 300.000,00"); Produto (1fr) absorve o espaço restante.
 */
const CARRINHO_PRODUTOS_GRID_CLASS =
  'grid grid-cols-[6.5rem_minmax(0,1fr)_2.75rem_4rem_5.5rem_7rem_3.5rem] gap-x-1 items-center'

const STEPPER_BTN_CLASS =
  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-35'

const ACAO_BTN_CLASS =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-800'

const ACAO_REMOVER_CLASS =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-red-500 transition-colors hover:bg-red-50 hover:text-red-600'

function PedidoCarrinhoQtdPilula({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-center">
      <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5">
        {children}
      </div>
    </div>
  )
}

/** Desloca o nome do complemento à direita sem mover Unid., Val Unit., Total etc. */
const COMPLEMENTO_CARRINHO_NOME_DESLOCAMENTO_CLASS = 'pl-4'

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
    abrirEdicaoComplementoNoPainel,
    removerComplemento,
    removerProduto,
    setValoresEmEdicao,
    totalProdutos,
    valoresEmEdicao,
  } = useNovoPedidoFormContext()
  const { handleAbrirEdicaoProdutoDetalhes } = useNovoPedidoDetalheContext()
  const {
    longPressComplementoIndexRef,
    longPressComplementoTimeoutRef,
    longPressIndexRef,
    longPressTimeoutRef,
  } = useNovoPedidoUIContext()

  const [observacaoPedidoVisivel, setObservacaoPedidoVisivel] = useState(
    () => observacaoPedido.trim().length > 0
  )
  const [produtoPendendoRemocao, setProdutoPendendoRemocao] = useState<{
    index: number
    nome: string
  } | null>(null)

  return (
    <>
    <div className="flex min-h-0 min-w-0 flex-[5] basis-0 flex-col gap-2">
    <div className="scrollbar-thin flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border bg-gray-50">
      {produtos.length > 0 ? (
        <div className="p-2">
          {/* Cabeçalho da tabela */}
          <div
            className={`mb-2 border-b border-gray-300 pb-2 ${CARRINHO_PRODUTOS_GRID_CLASS}`}
          >
            <div className="flex items-center justify-center">
              <span className="text-center text-xs font-semibold text-gray-700">Qtd</span>
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-gray-700">Produto</span>
            </div>
            <div>
              <span className="block text-center text-xs font-semibold text-gray-700">Unid.</span>
            </div>
            <div>
              <span className="block text-right text-xs font-semibold text-gray-700">
                Desc./Acres.
              </span>
            </div>
            <div>
              <span className="block text-right text-xs font-semibold text-gray-700 tabular-nums">
                Val Unit.
              </span>
            </div>
            <div>
              <span className="block whitespace-nowrap text-right text-xs font-semibold text-gray-700 tabular-nums">
                Total
              </span>
            </div>
            <div />
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
                    className={`rounded ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } cursor-pointer hover:bg-gray-100 ${CARRINHO_PRODUTOS_GRID_CLASS}`}
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
                    <PedidoCarrinhoQtdPilula>
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
                          className={STEPPER_BTN_CLASS}
                        >
                          <MdRemove className="h-3.5 w-3.5" />
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
                          className={`h-6 min-w-0 border-0 bg-transparent p-0 text-center text-xs font-medium tabular-nums text-gray-900 focus:outline-none ${
                            qtdProdutoDecimal ? 'w-10' : 'w-7'
                          }`}
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
                          className={STEPPER_BTN_CLASS}
                        >
                          <MdAdd className="h-3.5 w-3.5" />
                        </button>
                    </PedidoCarrinhoQtdPilula>
                    {/* Nome do Produto */}
                    <div className="min-w-0">
                      <span
                        className="block truncate text-xs text-gray-900 cursor-pointer"
                        title="Duplo clique para editar o produto"
                        onDoubleClick={e => {
                          e.stopPropagation()
                          handleAbrirEdicaoProdutoDetalhes(produto.produtoId, {
                            initialStepProduto: 0,
                          })
                        }}
                      >
                        {produto.nome}
                      </span>
                    </div>
                    {/* Unidade de medida */}
                    <div>
                      <span className="block text-center text-xs text-gray-600">
                        {formatarUnidadeMedidaProdutoExibicao(unidadeMedida)}
                      </span>
                    </div>
                    {/* Desconto/Acréscimo */}
                    <div>
                      <span className="block truncate text-right text-xs text-gray-600">
                        {formatarDescontoAcrescimo(produto)}
                      </span>
                    </div>
                    {/* Valor Unitário */}
                    <div className="min-w-0">
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
                          className="h-7 w-full border-0 bg-transparent px-1 text-right text-xs tabular-nums focus:bg-white focus:ring-1 focus:ring-primary"
                        />
                      ) : (
                        <span className="block truncate px-1 text-right text-xs tabular-nums text-gray-900">
                          {valorUnitarioExibicao}
                        </span>
                      )}
                    </div>
                    {/* Total */}
                    <div>
                      <span className="block whitespace-nowrap px-1 text-right text-xs font-semibold tabular-nums text-gray-900">
                        R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
                      </span>
                    </div>
                    {/* Ações: menu compacto + remover */}
                    <div
                      className="flex items-center justify-end gap-0.5"
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
                            className={ACAO_BTN_CLASS}
                          >
                            <MdMoreHoriz className="h-5 w-5" />
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
                        onClick={() =>
                          setProdutoPendendoRemocao({ index, nome: produto.nome })
                        }
                        type="button"
                        title="Remover produto"
                        aria-label="Remover produto"
                        className={ACAO_REMOVER_CLASS}
                      >
                        <MdDeleteOutline className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {produto.observacao?.trim() ? (
                    <div
                      className={`flex gap-1 rounded pb-0.5 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <div className="w-[6.5rem] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="block break-words text-[11px] leading-tight text-gray-500">
                          Obs: {produto.observacao.trim()}
                        </span>
                      </div>
                      <div className="w-[3.5rem] shrink-0" />
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
                        className={`-mt-0.5 rounded ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        } cursor-pointer hover:bg-gray-100 ${CARRINHO_PRODUTOS_GRID_CLASS}`}
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
                        <PedidoCarrinhoQtdPilula>
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
                            className={STEPPER_BTN_CLASS}
                          >
                            <MdRemove className="h-3.5 w-3.5" />
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
                            className="h-6 w-7 min-w-0 border-0 bg-transparent p-0 text-center text-xs font-medium tabular-nums text-gray-600 focus:outline-none"
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
                            className={STEPPER_BTN_CLASS}
                          >
                            <MdAdd className="h-3.5 w-3.5" />
                          </button>
                        </PedidoCarrinhoQtdPilula>
                        {/* Nome do Complemento com indentação */}
                        <div className={`min-w-0 ${COMPLEMENTO_CARRINHO_NOME_DESLOCAMENTO_CLASS}`}>
                          <span
                            className="block truncate text-xs leading-tight text-gray-600 cursor-pointer"
                            title="Duplo clique para editar o complemento"
                            onDoubleClick={e => {
                              e.stopPropagation()
                              abrirEdicaoComplementoNoPainel(complemento.id, {
                                produtoIdCarrinho: produto.produtoId,
                              })
                            }}
                          >
                            {complemento.nome}
                          </span>
                        </div>
                        <div aria-hidden />
                        <div aria-hidden />
                       
                        {/* Valor Unitário do Complemento - Apenas exibição */}
                        <div className="min-w-0">
                          <span className="block truncate px-1 text-right text-xs leading-tight tabular-nums text-gray-600">
                            {formatarValorComplemento(
                              complemento.valor,
                              complemento.tipoImpactoPreco
                            )}
                          </span>
                        </div>
                        {/* Espaço vazio onde seria o Total (complementos não têm total próprio) */}
                        <div aria-hidden />
                        {/* Ações: alinhado à coluna do produto (espaço do menu + remover) */}
                        <div
                          className="flex items-center justify-end gap-0.5"
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                        >
                          <span className="block h-7 w-7 shrink-0" aria-hidden />
                          <button
                            onClick={() => removerComplemento(index, compIndex)}
                            type="button"
                            title="Remover complemento"
                            aria-label="Remover complemento"
                            className={ACAO_REMOVER_CLASS}
                          >
                            <MdDeleteOutline className="h-4 w-4" />
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
            <p className="max-w-[11rem] text-base leading-snug text-gray-600">
              Nada por aqui ainda.
              <br />
              Escolha um produto
              <br />
              para lançar no pedido.
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
            <button
              type="button"
              aria-label={
                observacaoPedidoVisivel
                  ? 'Ocultar observação do pedido'
                  : 'Adicionar observação ao pedido'
              }
              onClick={() => setObservacaoPedidoVisivel(!observacaoPedidoVisivel)}
              className="flex h-7 max-w-full items-center gap-1.5 rounded border border-gray-300 bg-white px-2 text-gray-600 transition-colors hover:border-primary hover:text-primary"
            >
              {observacaoPedidoVisivel ? (
                <MdRemove className="h-4 w-4 shrink-0" />
              ) : (
                <MdEdit className="h-4 w-4 shrink-0" />
              )}
              <span className="truncate text-xs font-medium">
                {observacaoPedidoVisivel
                  ? 'Ocultar recado'
                  : 'Deixar um recado no pedido'}
              </span>
            </button>
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
    <JiffyConfirmDialog
      open={produtoPendendoRemocao != null}
      onOpenChange={open => {
        if (!open) setProdutoPendendoRemocao(null)
      }}
      title="Remover do pedido?"
      description={
        produtoPendendoRemocao ? (
          <>
            <strong>{produtoPendendoRemocao.nome}</strong> sai da lista. Se mudar de ideia, é
            só lançar de novo.
          </>
        ) : null
      }
      cancelLabel="Manter"
      confirmLabel="Remover"
      confirmButtonClassName="bg-red-600 hover:bg-red-700"
      onConfirm={() => {
        if (produtoPendendoRemocao == null) return
        removerProduto(produtoPendendoRemocao.index)
        setProdutoPendendoRemocao(null)
      }}
      dialogSx={{
        zIndex: 1400,
        '& .MuiDialog-container': { zIndex: 1400 },
      }}
    />
  </>
  )
}
