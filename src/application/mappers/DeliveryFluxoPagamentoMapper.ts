import type { PedidoDeliverySummaryApi } from '@/src/application/dto/api/pedidoDeliveryListApi'
import {
  cobrancaRawCobraNaEntrega,
  cobrancaRawEstaCancelada,
} from '@/src/application/mappers/situacaoCobrancaDelivery'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'

/** Antecipado (já pago / pagar agora) vs cobrar na entrega/retirada — summary delivery. */
export function derivarFluxoPagamentoEntregaDeliverySummary(
  totalFaltaPagar: number,
  cobrancas?: PedidoDeliverySummaryApi['cobrancas']
): FluxoPagamentoEntrega {
  const lista = Array.isArray(cobrancas) ? cobrancas : []
  if (lista.some(c => cobrancaRawCobraNaEntrega(c))) return 'cobrar_entregador'

  const temCobrancaNaEntrega = lista.some(
    c => !cobrancaRawEstaCancelada(c) && c.momentoCobranca === 'na_entrega'
  )
  if (temCobrancaNaEntrega && totalFaltaPagar > 0) return 'cobrar_entregador'

  return 'ja_pago'
}
