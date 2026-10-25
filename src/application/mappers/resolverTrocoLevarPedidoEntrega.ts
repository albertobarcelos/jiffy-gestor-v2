import {
  nomesMeiosPagamentoDeVendaDelivery,
  pagamentosDeVendaDeliveryParaTroco,
} from '@/src/application/mappers/CobrancaDeliveryPagamentoMapper'
import {
  calcularTrocoPedido,
  valorCobrancaDeCedula,
} from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import {
  pagamentoEstaCancelado,
  pagamentoPendenteNaEntrega,
} from '@/src/domain/services/pedido/RegrasPagamentoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

function roundCentavos(valor: number): number {
  return Math.round(valor * 100) / 100
}

function numeroFinito(valor: unknown): number {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

/**
 * Troco que o entregador deve levar.
 * Prefere `troco` da raiz quando o backend já calculou (pagamento efetivo).
 * Cobrança pendente na entrega (cardápio) usa a mesma regra de domínio da aba Pagamento.
 */
export function resolverTrocoLevarPedidoEntrega(
  vendaData: Record<string, unknown>,
  pagamentos: PagamentoSelecionado[] = [],
  nomesMeiosPagamentoPorId: Record<string, string> = {}
): number {
  const trocoRaiz = Number(vendaData.troco)
  if (Number.isFinite(trocoRaiz) && trocoRaiz > 0) {
    return roundCentavos(trocoRaiz)
  }

  const valorFinal = Number(vendaData.valorFinal)
  if (!Number.isFinite(valorFinal) || valorFinal <= 0) return 0

  const pagamentosValidos =
    pagamentos.length > 0 ? pagamentos : pagamentosDeVendaDeliveryParaTroco(vendaData)

  return roundCentavos(
    calcularTrocoPedido({
      pagamentos: pagamentosValidos,
      totalProdutos: valorFinal,
      nomesMeiosPagamentoPorId: {
        ...nomesMeiosPagamentoDeVendaDelivery(vendaData),
        ...nomesMeiosPagamentoPorId,
      },
      considerarApenasNaoCancelados: true,
    })
  )
}

/**
 * Valor a cobrar na entrega e troco a levar — mesma conversão cobrança → pagamento
 * do detalhe, do kanban e do cupom (`pagamentosDeVendaDeliveryParaTroco`).
 */
export function resolverCobrancaNaEntregaPedido(
  vendaData: Record<string, unknown>,
  nomesMeiosPagamentoPorId: Record<string, string> = {}
): { valorCobrarNaEntrega: number; trocoParaLevar: number } {
  const pagamentos = pagamentosDeVendaDeliveryParaTroco(vendaData)
  const troco = resolverTrocoLevarPedidoEntrega(vendaData, pagamentos, nomesMeiosPagamentoPorId)
  const somaCedula = pagamentos
    .filter(p => !pagamentoEstaCancelado(p) && pagamentoPendenteNaEntrega(p))
    .reduce((soma, p) => soma + (Number(p.valor) || 0), 0)
  const valorCobrarNaEntrega =
    pagamentos.length > 0
      ? valorCobrancaDeCedula(somaCedula, troco)
      : roundCentavos(numeroFinito(vendaData.totalFaltaPagar))
  return {
    valorCobrarNaEntrega,
    trocoParaLevar: troco > 0 ? roundCentavos(troco) : 0,
  }
}
