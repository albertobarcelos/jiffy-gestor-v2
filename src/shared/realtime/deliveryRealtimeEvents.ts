/** Nomes de eventos Socket.IO do canal delivery (contrato backend / AsyncAPI). */
export const DELIVERY_REALTIME_EVENTS = {
  PEDIDO_DELIVERY_CRIADO: 'PEDIDO_DELIVERY_CRIADO',
  PEDIDO_DELIVERY_STATUS_ALTERADO: 'PEDIDO_DELIVERY_STATUS_ALTERADO',
  PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA: 'PEDIDO_DELIVERY_IMPRESSAO_SOLICITADA',
} as const

export type DeliveryRealtimeEventName =
  (typeof DELIVERY_REALTIME_EVENTS)[keyof typeof DELIVERY_REALTIME_EVENTS]

/** Payload mínimo do comando de impressão (sala `estacao:{id}`). */
export interface PedidoDeliveryImpressaoSolicitadaPayload {
  vendaId: string
  codigoVenda: string
  numeroVenda: number
}

/**
 * Summary do pedido (mesmo DTO da listagem HTTP).
 * Tipado de forma frouxa no shared para nao acoplar a application/dto.
 */
export type PedidoDeliveryCriadoPayload = Record<string, unknown>

/** Summary apos transicao de status (mesmo shape do CRIADO). */
export type PedidoDeliveryStatusAlteradoPayload = PedidoDeliveryCriadoPayload

export function isPedidoDeliveryImpressaoSolicitadaPayload(
  value: unknown
): value is PedidoDeliveryImpressaoSolicitadaPayload {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return (
    typeof o.vendaId === 'string' &&
    o.vendaId.trim().length > 0 &&
    typeof o.codigoVenda === 'string' &&
    typeof o.numeroVenda === 'number' &&
    Number.isFinite(o.numeroVenda)
  )
}
