import type { PedidoDeliveryApiResponse } from '@/src/application/dto/api/pedidoDeliveryApi'

export function parsePedidoDeliveryApiResponse(resultado: unknown): string | null {
  if (!resultado || typeof resultado !== 'object') return null
  const r = resultado as PedidoDeliveryApiResponse & {
    vendaId?: string
    data?: { id?: string; vendaId?: string }
  }
  const id = r.id ?? r.vendaId ?? r.data?.id ?? r.data?.vendaId
  return id != null ? String(id).trim() || null : null
}
