import type { PedidoDeliverySummaryApi } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'

/** Antecipado (já pago / pagar agora) vs cobrar na entrega/retirada — summary delivery. */
export function derivarFluxoPagamentoEntregaDeliverySummary(
  totalFaltaPagar: number,
  cobrancas?: PedidoDeliverySummaryApi['cobrancas']
): FluxoPagamentoEntrega {
  const lista = Array.isArray(cobrancas) ? cobrancas : []
  const cobrarNaEntregaPendente = lista.some(c => {
    if (c.status === 'cancelada') return false
    return c.momentoCobranca === 'na_entrega' && c.status !== 'paga'
  })
  if (cobrarNaEntregaPendente) return 'cobrar_entregador'

  const temCobrancaNaEntrega = lista.some(
    c => c.status !== 'cancelada' && c.momentoCobranca === 'na_entrega'
  )
  if (temCobrancaNaEntrega && totalFaltaPagar > 0) return 'cobrar_entregador'

  return 'ja_pago'
}
