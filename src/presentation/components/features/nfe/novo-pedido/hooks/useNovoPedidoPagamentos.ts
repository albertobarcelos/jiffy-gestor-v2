'use client'

import { useMemo } from 'react'
import type { PagamentoSelecionado } from '../types'
import {
  pagamentoContaComoEfetivo,
  pagamentoDeveAparecerNosDetalhesPedido,
  pagamentoEstaCancelado,
} from '../novoPedidoPagamentoHelpers'

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
  const totalPagamentos = useMemo(() => {
    return pagamentos.reduce((sum, p) => {
      return sum + (pagamentoContaComoEfetivo(p) ? p.valor : 0)
    }, 0)
  }, [pagamentos])

  const totalPagamentosLancados = useMemo(() => {
    return pagamentos.reduce((sum, p) => {
      return sum + (!pagamentoEstaCancelado(p) ? p.valor : 0)
    }, 0)
  }, [pagamentos])

  const valorAPagar = useMemo(() => {
    return Math.max(0, totalProdutos - totalPagamentos)
  }, [totalPagamentos, totalProdutos])

  const valorAPagarLancamento = useMemo(() => {
    if (pagamentoModoCobranca) {
      return Math.max(0, totalProdutos - totalPagamentosLancados)
    }
    return valorAPagar
  }, [pagamentoModoCobranca, totalPagamentosLancados, totalProdutos, valorAPagar])

  const statusPagamentoPedido = useMemo<'pendente' | 'parcial' | 'pago'>(() => {
    if (totalPagamentos <= 0) return 'pendente'
    if (valorAPagar > 0.01) return 'parcial'
    return 'pago'
  }, [totalPagamentos, valorAPagar])

  const rotuloStatusPagamento = useMemo(() => {
    if (statusPagamentoPedido === 'pago') return 'Pago'
    if (statusPagamentoPedido === 'parcial') return 'Parcial'
    return 'Pendente'
  }, [statusPagamentoPedido])

  const statusPagamentoExibicao = pagamentoModoCobranca ? 'pendente' : statusPagamentoPedido
  const rotuloStatusPagamentoExibicao = pagamentoModoCobranca ? 'Pendente' : rotuloStatusPagamento

  const troco = useMemo(() => {
    if (pagamentos.length === 0) return 0

    for (let i = pagamentos.length - 1; i >= 0; i--) {
      const p = pagamentos[i]
      if (!p || !pagamentoContaComoEfetivo(p)) continue

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
  }, [meiosPagamento, pagamentos, totalProdutos])

  const trocoLancamento = useMemo(() => {
    if (!pagamentoModoCobranca) return troco
    if (pagamentos.length === 0) return 0

    for (let i = pagamentos.length - 1; i >= 0; i--) {
      const p = pagamentos[i]
      if (!p || pagamentoEstaCancelado(p)) continue

      const meioUltimoPagamento = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
      if (!meioUltimoPagamento) continue

      const nomeMeio = meioUltimoPagamento.getNome().toLowerCase()
      const isDinheiro = nomeMeio.includes('dinheiro') || nomeMeio.includes('cash')
      if (!isDinheiro) continue

      const totalAntes = pagamentos.slice(0, i).reduce((acc, x) => {
        return acc + (!pagamentoEstaCancelado(x) ? x.valor : 0)
      }, 0)
      const valorFaltavaPagar = totalProdutos - totalAntes

      if (p.valor > valorFaltavaPagar) {
        return p.valor - valorFaltavaPagar
      }
      return 0
    }

    return 0
  }, [meiosPagamento, pagamentoModoCobranca, pagamentos, totalProdutos, troco])

  const pagamentosVisiveisNaAbaDetalhes = useMemo(
    () => pagamentos.filter(pagamentoDeveAparecerNosDetalhesPedido),
    [pagamentos]
  )

  return {
    totalPagamentos,
    totalPagamentosLancados,
    valorAPagar,
    valorAPagarLancamento,
    statusPagamentoPedido,
    rotuloStatusPagamento,
    statusPagamentoExibicao,
    rotuloStatusPagamentoExibicao,
    troco,
    trocoLancamento,
    pagamentosVisiveisNaAbaDetalhes,
  }
}
