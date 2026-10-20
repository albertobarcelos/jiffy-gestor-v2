'use client'

import { useMemo } from 'react'
import type { PagamentoSelecionado } from '../types'
import {
  calcularTrocoPedido,
  calcularValorAPagar,
  resolverStatusPagamentoExibicaoPedido,
  resolverStatusPagamentoPedido,
  rotuloStatusPagamento,
  totalPagamentosEfetivos,
  totalPagamentosLancados,
} from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import {
  pagamentoDeveAparecerNosDetalhesPedido,
  pedidoTemCobrancaPendenteNaEntrega,
} from '@/src/domain/services/pedido/RegrasPagamentoPedido'

interface MeioPagamentoLike {
  getId(): string
  getNome(): string
}

interface UseNovoPedidoPagamentosParams {
  pagamentos: PagamentoSelecionado[]
  totalProdutos: number
  pagamentoModoCobranca: boolean
  meiosPagamento: MeioPagamentoLike[]
}

export function useNovoPedidoPagamentos({
  pagamentos,
  totalProdutos,
  pagamentoModoCobranca,
  meiosPagamento,
}: UseNovoPedidoPagamentosParams) {
  const totalPagamentos = useMemo(
    () => totalPagamentosEfetivos(pagamentos),
    [pagamentos]
  )

  const totalPagamentosLancadosValor = useMemo(
    () => totalPagamentosLancados(pagamentos),
    [pagamentos]
  )

  const valorAPagar = useMemo(
    () => calcularValorAPagar(totalProdutos, totalPagamentos),
    [totalPagamentos, totalProdutos]
  )

  const valorAPagarLancamento = useMemo(
    () => calcularValorAPagar(totalProdutos, totalPagamentosLancadosValor),
    [totalPagamentosLancadosValor, totalProdutos]
  )

  const statusPagamentoPedido = useMemo(
    () => resolverStatusPagamentoPedido(totalPagamentos, valorAPagar),
    [totalPagamentos, valorAPagar]
  )

  const statusPagamentoExibicao = useMemo(
    () => resolverStatusPagamentoExibicaoPedido(pagamentos, totalPagamentos, valorAPagar),
    [pagamentos, totalPagamentos, valorAPagar]
  )

  const rotuloStatusPagamentoValor = useMemo(
    () => rotuloStatusPagamento(statusPagamentoPedido),
    [statusPagamentoPedido]
  )

  const rotuloStatusPagamentoExibicao = useMemo(
    () => rotuloStatusPagamento(statusPagamentoExibicao),
    [statusPagamentoExibicao]
  )

  const troco = useMemo(
    () =>
      calcularTrocoPedido({
        pagamentos,
        totalProdutos,
        meiosPagamento,
      }),
    [meiosPagamento, pagamentos, totalProdutos]
  )

  const trocoLancamento = useMemo(() => {
    if (!pagamentoModoCobranca && !pedidoTemCobrancaPendenteNaEntrega(pagamentos)) {
      return troco
    }
    return calcularTrocoPedido({
      pagamentos,
      totalProdutos,
      meiosPagamento,
      considerarApenasNaoCancelados: true,
    })
  }, [meiosPagamento, pagamentoModoCobranca, pagamentos, totalProdutos, troco])

  const pagamentosVisiveisNaAbaDetalhes = useMemo(
    () => pagamentos.filter(pagamentoDeveAparecerNosDetalhesPedido),
    [pagamentos]
  )

  return {
    totalPagamentos,
    totalPagamentosLancados: totalPagamentosLancadosValor,
    valorAPagar,
    valorAPagarLancamento,
    statusPagamentoPedido,
    rotuloStatusPagamento: rotuloStatusPagamentoValor,
    statusPagamentoExibicao,
    rotuloStatusPagamentoExibicao,
    troco,
    trocoLancamento,
    pagamentosVisiveisNaAbaDetalhes,
  }
}
