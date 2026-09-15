'use client'

import type { ProdutoSelecionado } from '@/src/domain/types/pedido'
import {
  obterUnidadeMedidaProdutoLinha,
  produtoPermiteAlterarPreco,
} from '@/src/domain/policies/pedido/CarrinhoCatalogoPolicy'
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
import { DropdownMenu, DropdownMenuItem } from '@/src/presentation/components/ui/dropdown-menu'
import {
  MdDeleteOutline,
  MdEdit,
  MdLaunch,
  MdMoreHoriz,
  MdNote,
} from 'react-icons/md'
import { useNovoPedidoFormContext } from '../../context/NovoPedidoFormContext'
import { useNovoPedidoDetalheContext } from '../../context/NovoPedidoDetalheContext'
import { useNovoPedidoUIContext } from '../../context/NovoPedidoUIContext'
import { criarHandlersLongPressLinha } from '../../utils/longPressLinhaPedido'
import { PedidoCarrinhoLinhaComplemento } from './PedidoCarrinhoLinhaComplemento'
import { PedidoCarrinhoQtdStepper } from './PedidoCarrinhoQtdStepper'
import type { ProdutoPendendoRemocao } from './PedidoCarrinhoRemoverDialog'
import {
  ACAO_BTN_CLASS,
  ACAO_REMOVER_CLASS,
  CARRINHO_PRODUTOS_GRID_CLASS,
} from './pedidoCarrinhoLayout'

type PedidoCarrinhoLinhaProdutoProps = {
  produto: ProdutoSelecionado
  index: number
  onPedirRemocao: (produto: ProdutoPendendoRemocao) => void
}

export function PedidoCarrinhoLinhaProduto({
  produto,
  index,
  onPedirRemocao,
}: PedidoCarrinhoLinhaProdutoProps) {
  const {
    abrirModalComplementosProdutoExistente,
    abrirModalEdicaoProduto,
    abrirModalObservacaoProduto,
    atualizarProduto,
    calcularTotalProduto,
    catalogoProdutosPorId,
    formatarDescontoAcrescimo,
    formatarNumeroComMilhar,
    produtosList,
    setValoresEmEdicao,
    valoresEmEdicao,
  } = useNovoPedidoFormContext()
  const { handleAbrirEdicaoProdutoDetalhes } = useNovoPedidoDetalheContext()
  const { longPressIndexRef, longPressTimeoutRef } = useNovoPedidoUIContext()

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
    produto.valorUnitario > 0 ? formatarNumeroComMilhar(produto.valorUnitario) : '0,00'

  const longPress = criarHandlersLongPressLinha({
    index,
    indexRef: longPressIndexRef,
    timeoutRef: longPressTimeoutRef,
    onLongPress: () => {
      void abrirModalEdicaoProduto(index)
    },
  })

  return (
    <div className="space-y-0">
      <div
        className={`rounded ${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        } cursor-pointer hover:bg-gray-100 ${CARRINHO_PRODUTOS_GRID_CLASS}`}
        {...longPress}
      >
        <PedidoCarrinhoQtdStepper
          ariaLabelMenos="Diminuir quantidade"
          ariaLabelMais="Aumentar quantidade"
          ariaLabelQuantidade="Quantidade"
          inputMode={qtdProdutoDecimal ? 'decimal' : 'numeric'}
          value={
            valoresEmEdicao[qtdProdKey] !== undefined
              ? valoresEmEdicao[qtdProdKey]
              : formatarQuantidadeProdutoExibicao(produto.quantidade, unidadeMedida)
          }
          menosDisabled={!quantidadeProdutoPodeDiminuir(produto.quantidade, unidadeMedida)}
          inputClassName={`h-6 min-w-0 border-0 bg-transparent p-0 text-center text-xs font-medium tabular-nums text-gray-900 focus:outline-none ${
            qtdProdutoDecimal ? 'w-10' : 'w-7'
          }`}
          onMenos={e => {
            e.stopPropagation()
            const proxima = incrementarQuantidadeProduto(produto.quantidade, -1, unidadeMedida)
            atualizarProduto(index, 'quantidade', proxima)
            setValoresEmEdicao((prev: Record<string | number, string>) => {
              const next = { ...prev }
              delete next[qtdProdKey]
              return next
            })
          }}
          onMais={e => {
            e.stopPropagation()
            const proxima = incrementarQuantidadeProduto(produto.quantidade, 1, unidadeMedida)
            atualizarProduto(index, 'quantidade', proxima)
            setValoresEmEdicao((prev: Record<string | number, string>) => {
              const next = { ...prev }
              delete next[qtdProdKey]
              return next
            })
          }}
          onChange={e => {
            e.stopPropagation()
            const texto = sanitizarTextoQuantidadeProdutoEmEdicao(e.target.value, unidadeMedida)
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
              [qtdProdKey]: formatarQuantidadeProdutoExibicao(produto.quantidade, unidadeMedida),
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
        />
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
        <div>
          <span className="block text-center text-xs text-gray-600">
            {formatarUnidadeMedidaProdutoExibicao(unidadeMedida)}
          </span>
        </div>
        <div>
          <span className="block truncate text-right text-xs text-gray-600">
            {formatarDescontoAcrescimo(produto)}
          </span>
        </div>
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

                valorStr = valorStr.replace(/\./g, '').replace(',', '').replace(/\D/g, '')

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
        <div>
          <span className="block whitespace-nowrap px-1 text-right text-xs font-semibold tabular-nums text-gray-900">
            R$ {formatarNumeroComMilhar(totalProdutoComComplementos)}
          </span>
        </div>
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
              onClick={() => void abrirModalComplementosProdutoExistente(index)}
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
            onClick={() => onPedirRemocao({ index, nome: produto.nome })}
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

      {produto.complementos.map((complemento, compIndex) => (
        <PedidoCarrinhoLinhaComplemento
          key={`comp-${index}-${complemento.grupoId}-${complemento.id}`}
          produto={produto}
          index={index}
          complemento={complemento}
          compIndex={compIndex}
          unidadeMedida={unidadeMedida}
        />
      ))}
    </div>
  )
}
