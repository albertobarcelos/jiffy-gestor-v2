import {
  nomesMeiosPagamentoDeVendaDelivery,
  pagamentosDeVendaDeliveryParaTroco,
} from '@/src/application/mappers/CobrancaDeliveryPagamentoMapper'
import { calcularTrocoPedido } from '@/src/domain/services/pedido/CalculadoraPagamentoPedido'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'

function roundCentavos(valor: number): number {
  return Math.round(valor * 100) / 100
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
