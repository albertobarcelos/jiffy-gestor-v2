'use client'

import type { ComplementoSelecionado, ProdutoSelecionado } from '@/src/domain/types/pedido'
import type { UnidadeMedidaProduto } from '@/src/shared/types/unidadeMedidaProduto'
import {
  ajustarQuantidadeComplementoLivre,
  controleQuantidadeComplementoNaLinha,
} from '@/src/domain/policies/pedido/ComplementoQuantidadeLinhaPolicy'
import { MdDeleteOutline } from 'react-icons/md'
import { useNovoPedidoFormContext } from '../../context/NovoPedidoFormContext'
import { useNovoPedidoUIContext } from '../../context/NovoPedidoUIContext'
import { criarHandlersLongPressLinha } from '../../utils/longPressLinhaPedido'
import { PedidoCarrinhoQtdStepper } from './PedidoCarrinhoQtdStepper'
import {
  ACAO_REMOVER_CLASS,
  CARRINHO_PRODUTOS_GRID_CLASS,
  COMPLEMENTO_CARRINHO_NOME_DESLOCAMENTO_CLASS,
} from './pedidoCarrinhoLayout'

type PedidoCarrinhoLinhaComplementoProps = {
  produto: ProdutoSelecionado
  index: number
  complemento: ComplementoSelecionado
  compIndex: number
  unidadeMedida: UnidadeMedidaProduto
}

export function PedidoCarrinhoLinhaComplemento({
  produto,
  index,
  complemento,
  compIndex,
  unidadeMedida,
}: PedidoCarrinhoLinhaComplementoProps) {
  const {
    atualizarComplemento,
    formatarValorComplemento,
    abrirEdicaoComplementoNoPainel,
    abrirModalComplementosProdutoExistente,
    removerComplemento,
    setValoresEmEdicao,
    valoresEmEdicao,
  } = useNovoPedidoFormContext()
  const {
    longPressComplementoIndexRef,
    longPressComplementoTimeoutRef,
  } = useNovoPedidoUIContext()

  const compKey = `comp-${index}-${complemento.grupoId}-${complemento.id}`
  const qtdCompKey = `qtd-${compKey}`
  const controle = controleQuantidadeComplementoNaLinha(
    produto.quantidade,
    complemento.quantidade,
    unidadeMedida
  )

  const longPress = criarHandlersLongPressLinha({
    index,
    indexRef: longPressComplementoIndexRef,
    timeoutRef: longPressComplementoTimeoutRef,
    onLongPress: () => {
      void abrirModalComplementosProdutoExistente(index)
    },
  })

  return (
    <div
      className={`-mt-0.5 rounded ${
        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      } cursor-pointer hover:bg-gray-100 ${CARRINHO_PRODUTOS_GRID_CLASS}`}
      style={{ minHeight: '24px' }}
      {...longPress}
    >
      <PedidoCarrinhoQtdStepper
        ariaLabelMenos="Diminuir quantidade do complemento"
        ariaLabelMais="Aumentar quantidade do complemento"
        ariaLabelQuantidade="Quantidade do complemento"
        inputMode="numeric"
        readOnly={controle.travada}
        value={
          valoresEmEdicao[qtdCompKey] !== undefined
            ? valoresEmEdicao[qtdCompKey]
            : String(controle.quantidadeExibida)
        }
        menosDisabled={controle.menosDesabilitado}
        maisDisabled={controle.maisDesabilitado}
        inputClassName="h-6 w-7 min-w-0 border-0 bg-transparent p-0 text-center text-xs font-medium tabular-nums text-gray-600 focus:outline-none"
        onMenos={e => {
          e.stopPropagation()
          atualizarComplemento(
            index,
            compIndex,
            'quantidade',
            ajustarQuantidadeComplementoLivre(complemento.quantidade, -1)
          )
          setValoresEmEdicao((prev: Record<string | number, string>) => {
            const next = { ...prev }
            delete next[qtdCompKey]
            return next
          })
        }}
        onMais={e => {
          e.stopPropagation()
          atualizarComplemento(
            index,
            compIndex,
            'quantidade',
            ajustarQuantidadeComplementoLivre(complemento.quantidade, 1)
          )
          setValoresEmEdicao((prev: Record<string | number, string>) => {
            const next = { ...prev }
            delete next[qtdCompKey]
            return next
          })
        }}
        onChange={e => {
          if (controle.travada) return
          e.stopPropagation()
          const digits = e.target.value.replace(/\D/g, '')
          setValoresEmEdicao((prev: Record<string | number, string>) => ({
            ...prev,
            [qtdCompKey]: digits,
          }))
          if (digits !== '') {
            const valor = parseInt(digits, 10)
            if (Number.isFinite(valor) && valor >= 1) {
              atualizarComplemento(index, compIndex, 'quantidade', valor)
            }
          }
        }}
        onFocus={e => {
          if (controle.travada) return
          e.stopPropagation()
          setValoresEmEdicao((prev: Record<string | number, string>) => ({
            ...prev,
            [qtdCompKey]: String(Math.floor(complemento.quantidade)),
          }))
          setTimeout(() => e.target.select(), 0)
        }}
        onBlur={e => {
          if (controle.travada) return
          e.stopPropagation()
          const digits = e.target.value.replace(/\D/g, '')
          const valor = parseInt(digits, 10)
          const qtdFinal = Number.isFinite(valor) && valor >= 1 ? valor : 1
          atualizarComplemento(index, compIndex, 'quantidade', qtdFinal)
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
      />
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
      <div className="min-w-0">
        <span className="block truncate px-1 text-right text-xs leading-tight tabular-nums text-gray-600">
          {formatarValorComplemento(complemento.valor, complemento.tipoImpactoPreco)}
        </span>
      </div>
      <div aria-hidden />
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
}
