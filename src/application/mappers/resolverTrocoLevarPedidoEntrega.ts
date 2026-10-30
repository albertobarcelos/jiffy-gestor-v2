import {
  nomesMeiosPagamentoDeVendaDelivery,
  pagamentosDeVendaDeliveryParaTroco,
} from '@/src/application/mappers/CobrancaDeliveryPagamentoMapper'
import { calcularTrocoPedido } from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

function roundCentavos(valor: number): number {
  return Math.round(valor * 100) / 100
}

function numeroCampo(valor: unknown): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (typeof valor === 'string' && valor.trim() !== '') {
    const n = Number(valor.replace(',', '.'))
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function trocoParaDaVenda(vendaData: Record<string, unknown>): number {
  const pagamento =
    vendaData.pagamento && typeof vendaData.pagamento === 'object'
      ? (vendaData.pagamento as Record<string, unknown>)
      : null
  return numeroCampo(vendaData.trocoPara ?? pagamento?.trocoPara)
}

/**
 * Troco que o entregador deve levar.
 * Prefere `troco` da raiz quando o backend já calculou (pagamento efetivo).
 * `trocoPara` (cédula informada no pedido) e cobrança pendente na entrega
 * usam a mesma regra de domínio da aba Pagamento.
 */
export function resolverTrocoLevarPedidoEntrega(
  vendaData: Record<string, unknown>,
  pagamentos: PagamentoSelecionado[] = [],
  nomesMeiosPagamentoPorId: Record<string, string> = {}
): number {
  const trocoRaiz = numeroCampo(vendaData.troco)
  if (trocoRaiz > 0) return roundCentavos(trocoRaiz)

  const valorFinal = numeroCampo(vendaData.valorFinal)
  if (valorFinal <= 0) return 0

  const trocoPara = trocoParaDaVenda(vendaData)
  if (trocoPara > valorFinal) return roundCentavos(trocoPara - valorFinal)

  const pagamentosValidos =
    pagamentos.length > 0 ? pagamentos : pagamentosDeVendaDeliveryParaTroco(vendaData)
  const nomes = {
    ...nomesMeiosPagamentoDeVendaDelivery(vendaData),
    ...nomesMeiosPagamentoPorId,
  }
  const derivado = roundCentavos(
    calcularTrocoPedido({
      pagamentos: pagamentosValidos,
      totalProdutos: valorFinal,
      nomesMeiosPagamentoPorId: nomes,
      considerarApenasNaoCancelados: true,
    })
  )
  if (derivado > 0) return derivado

  const cedula = pagamentosValidos.reduce((soma, pagamento) => soma + Number(pagamento.valor || 0), 0)
  if (cedula > valorFinal && !pagamentosValidos.some(pagamento => meioNomeadoNaoEhDinheiro(pagamento, nomes))) {
    return roundCentavos(cedula - valorFinal)
  }
  const faltaApi = numeroCampo(vendaData.totalFaltaPagar)
  if (pagamentosValidos.length === 0 && faltaApi > valorFinal) {
    return roundCentavos(faltaApi - valorFinal)
  }
  return 0
}

function meioNomeadoNaoEhDinheiro(
  pagamento: PagamentoSelecionado,
  nomes: Record<string, string>
): boolean {
  const nome = String(nomes[pagamento.meioPagamentoId] ?? '').trim().toLowerCase()
  if (!nome) return false
  return !nome.includes('dinheiro') && !nome.includes('cash')
}
