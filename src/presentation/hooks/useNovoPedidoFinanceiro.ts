'use client'

import { useMemo } from 'react'
import type { MeioPagamento } from '@/src/domain/entities/MeioPagamento'
import type {
  PagamentoSelecionado,
  ProdutoSelecionado,
} from '@/src/presentation/components/features/nfe/NovoPedidoModal/novoPedidoModal.types'
import {
  pagamentoContaComoEfetivo,
  pagamentoDeveAparecerNosDetalhesPedido,
} from '@/src/presentation/components/features/nfe/NovoPedidoModal/novoPedidoModal.utils'
import { calcularTotalProduto } from '@/src/presentation/components/features/nfe/NovoPedidoModal/novoPedidoModal.calculos'

export interface UseNovoPedidoFinanceiroParams {
  produtos: ProdutoSelecionado[]
  pagamentos: PagamentoSelecionado[]
  valorFinalVenda: number | null
  meiosPagamento: MeioPagamento[]
}

/**
 * Totais do pedido, troco e lista filtrada de pagamentos para o passo 4.
 */
export function useNovoPedidoFinanceiro({
  produtos,
  pagamentos,
  valorFinalVenda,
  meiosPagamento,
}: UseNovoPedidoFinanceiroParams) {
  const totalProdutos = useMemo(() => {
    if (valorFinalVenda !== null) {
      return valorFinalVenda
    }
    return produtos.reduce((sum, p) => sum + calcularTotalProduto(p), 0)
  }, [produtos, valorFinalVenda])

  const totalPagamentos = useMemo(
    () => pagamentos.reduce((sum, p) => sum + (pagamentoContaComoEfetivo(p) ? p.valor : 0), 0),
    [pagamentos]
  )

  const valorAPagar = useMemo(
    () => Math.max(0, totalProdutos - totalPagamentos),
    [totalProdutos, totalPagamentos]
  )

  const troco = useMemo(() => {
    if (pagamentos.length === 0) return 0
    for (let i = pagamentos.length - 1; i >= 0; i--) {
      const p = pagamentos[i]
      if (!pagamentoContaComoEfetivo(p)) continue
      const meioUltimoPagamento = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
      if (!meioUltimoPagamento) continue
      const nomeMeio = meioUltimoPagamento.getNome().toLowerCase()
      const isDinheiro = nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
      if (!isDinheiro) continue
      const totalAntes = pagamentos.slice(0, i).reduce((acc, x) => {
        return acc + (pagamentoContaComoEfetivo(x) ? x.valor : 0)
      }, 0)
      const valorFaltavaPagar = totalProdutos - totalAntes
      if (p.valor > valorFaltavaPagar) {
        return p.valor - valorFaltavaPagar
      }
      return 0
    }
    return 0
  }, [totalProdutos, pagamentos, meiosPagamento])

  const pagamentosVisiveisNaAbaDetalhes = useMemo(
    () => pagamentos.filter(pagamentoDeveAparecerNosDetalhesPedido),
    [pagamentos]
  )

  return {
    totalProdutos,
    totalPagamentos,
    valorAPagar,
    troco,
    pagamentosVisiveisNaAbaDetalhes,
  }
}
