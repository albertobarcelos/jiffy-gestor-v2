import type {
  AtualizarCobrancasPedidoDeliveryApi,
  CobrancaPedidoDeliveryApi,
  MomentoCobrancaDeliveryApi,
} from '@/src/application/dto/api/pedidoDeliveryApi'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'

export type PagamentoCobrancaPatchItem = {
  meioPagamentoId: string
  valor: number
}

export function extrairIdsCobrancasAtivasPedidoDelivery(
  pedido: Record<string, unknown>
): string[] {
  const cobrancas = Array.isArray(pedido.cobrancas) ? pedido.cobrancas : []
  return cobrancas
    .filter((raw): raw is Record<string, unknown> => raw != null && typeof raw === 'object')
    .filter(c => {
      const status = String(c.status ?? '').trim().toLowerCase()
      if (status === 'cancelada') return false
      const dataCancelamento = c.dataCancelamento
      if (dataCancelamento != null && String(dataCancelamento).trim() !== '') return false
      return String(c.id ?? '').trim().length > 0
    })
    .map(c => String(c.id))
}

export function buildAtualizarCobrancasPedidoDeliveryPatch(args: {
  cobrancaIdsAtivas: string[]
  pagamentos: PagamentoCobrancaPatchItem[]
  fluxoPagamentoEntrega: FluxoPagamentoEntrega
}): AtualizarCobrancasPedidoDeliveryApi {
  const momentoCobranca: MomentoCobrancaDeliveryApi =
    args.fluxoPagamentoEntrega === 'cobrar_entregador' ? 'na_entrega' : 'antecipado'

  const add: CobrancaPedidoDeliveryApi[] = args.pagamentos.map(p => {
    const item: CobrancaPedidoDeliveryApi = {
      meioPagamentoId: p.meioPagamentoId,
      valor: p.valor,
      momentoCobranca,
    }
    if (momentoCobranca === 'antecipado') {
      item.pagamentoEfetivado = { confirmar: true }
    }
    return item
  })

  const cancel = args.cobrancaIdsAtivas.map(cobrancaId => ({ cobrancaId }))

  return { cobrancas: { cancel, add } }
}
