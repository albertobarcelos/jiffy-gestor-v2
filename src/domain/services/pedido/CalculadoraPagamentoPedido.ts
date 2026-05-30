import {
  pagamentoContaComoEfetivo,
  pagamentoEstaCancelado,
} from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

export type StatusPagamentoPedido = 'pendente' | 'parcial' | 'pago'

export interface MeioPagamentoNomeLike {
  getId(): string
  getNome(): string
}

const TOLERANCIA_TOTAL = 0.01

export function totalPagamentosEfetivos(pagamentos: PagamentoSelecionado[]): number {
  return pagamentos.reduce(
    (sum, p) => sum + (pagamentoContaComoEfetivo(p) ? p.valor : 0),
    0
  )
}

export function totalPagamentosLancados(pagamentos: PagamentoSelecionado[]): number {
  return pagamentos.reduce(
    (sum, p) => sum + (!pagamentoEstaCancelado(p) ? p.valor : 0),
    0
  )
}

export function calcularValorAPagar(totalProdutos: number, totalPagamentos: number): number {
  return Math.max(0, totalProdutos - totalPagamentos)
}

export function resolverStatusPagamentoPedido(
  totalPagamentos: number,
  valorAPagar: number
): StatusPagamentoPedido {
  if (totalPagamentos <= 0) return 'pendente'
  if (valorAPagar > TOLERANCIA_TOTAL) return 'parcial'
  return 'pago'
}

export function rotuloStatusPagamento(status: StatusPagamentoPedido): string {
  if (status === 'pago') return 'Pago'
  if (status === 'parcial') return 'Parcial'
  return 'Pendente'
}

export function pagamentosCobremTotalPedido(
  totalProdutos: number,
  totalPagamentos: number,
  troco: number
): boolean {
  const diferenca = totalProdutos - totalPagamentos
  if (Math.abs(diferenca) <= TOLERANCIA_TOTAL) return true
  return totalPagamentos > totalProdutos && troco > 0
}

function meioEhDinheiro(nome: string): boolean {
  const lower = nome.toLowerCase()
  return lower.includes('dinheiro') || lower.includes('cash')
}

export function calcularTrocoPedido(args: {
  pagamentos: PagamentoSelecionado[]
  totalProdutos: number
  meiosPagamento: MeioPagamentoNomeLike[]
  considerarApenasNaoCancelados?: boolean
}): number {
  const { pagamentos, totalProdutos, meiosPagamento, considerarApenasNaoCancelados } = args
  if (pagamentos.length === 0) return 0

  for (let i = pagamentos.length - 1; i >= 0; i--) {
    const p = pagamentos[i]
    if (!p) continue
    if (considerarApenasNaoCancelados && pagamentoEstaCancelado(p)) continue
    if (!considerarApenasNaoCancelados && !pagamentoContaComoEfetivo(p)) continue

    const meio = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
    if (!meio || !meioEhDinheiro(meio.getNome())) continue

    const totalAntes = pagamentos.slice(0, i).reduce((acc, x) => {
      if (considerarApenasNaoCancelados) {
        return acc + (!pagamentoEstaCancelado(x) ? x.valor : 0)
      }
      return acc + (pagamentoContaComoEfetivo(x) ? x.valor : 0)
    }, 0)
    const valorFaltavaPagar = totalProdutos - totalAntes

    if (p.valor > valorFaltavaPagar) {
      return p.valor - valorFaltavaPagar
    }
    return 0
  }

  return 0
}
