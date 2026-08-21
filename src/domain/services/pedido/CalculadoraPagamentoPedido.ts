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

function emCentavos(valor: number): number {
  return Math.round(valor * 100)
}

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
  const diferencaCentavos = emCentavos(totalProdutos) - emCentavos(totalPagamentos)
  if (Math.abs(diferencaCentavos) <= Math.round(TOLERANCIA_TOTAL * 100)) return true
  return emCentavos(totalPagamentos) > emCentavos(totalProdutos) && troco > 0
}

export function meioNomeEhDinheiro(nome: string): boolean {
  const lower = nome.toLowerCase()
  return lower.includes('dinheiro') || lower.includes('cash')
}

export type LancamentoTroco = {
  valor: number
  isDinheiro: boolean
}

/**
 * Núcleo compartilhado de troco: último lançamento em dinheiro que ultrapassa o restante.
 */
export function calcularTrocoSobreLancamentos(args: {
  total: number
  lancamentos: LancamentoTroco[]
}): number {
  const { total, lancamentos } = args
  if (lancamentos.length === 0) return 0

  for (let i = lancamentos.length - 1; i >= 0; i--) {
    const p = lancamentos[i]
    if (!p?.isDinheiro) continue

    const totalAntes = lancamentos.slice(0, i).reduce((acc, x) => acc + x.valor, 0)
    const valorFaltavaPagar = total - totalAntes

    if (p.valor > valorFaltavaPagar) {
      return p.valor - Math.max(0, valorFaltavaPagar)
    }
    return 0
  }

  return 0
}

export function calcularTrocoPedido(args: {
  pagamentos: PagamentoSelecionado[]
  totalProdutos: number
  meiosPagamento: MeioPagamentoNomeLike[]
  considerarApenasNaoCancelados?: boolean
}): number {
  const { pagamentos, totalProdutos, meiosPagamento, considerarApenasNaoCancelados } = args

  const lancamentos: LancamentoTroco[] = []
  for (const p of pagamentos) {
    if (considerarApenasNaoCancelados) {
      if (pagamentoEstaCancelado(p)) continue
    } else if (!pagamentoContaComoEfetivo(p)) {
      continue
    }

    const meio = meiosPagamento.find(m => m.getId() === p.meioPagamentoId)
    lancamentos.push({
      valor: p.valor,
      isDinheiro: Boolean(meio && meioNomeEhDinheiro(meio.getNome())),
    })
  }

  return calcularTrocoSobreLancamentos({
    total: totalProdutos,
    lancamentos,
  })
}
