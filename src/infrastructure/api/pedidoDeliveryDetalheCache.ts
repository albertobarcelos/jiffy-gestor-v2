/**
 * Cache em memória do GET `/api/delivery/pedidos/{id}` (registro expandido).
 * Compartilhado entre quick view, impressão e sincronização do Kanban.
 */
const PEDIDO_DELIVERY_DETALHE_CACHE = new Map<string, Record<string, unknown>>()

export function extrairRegistroPedidoDelivery(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  if (o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>
  }
  return o
}

export function obterPedidoDeliveryDetalheCache(vendaId: string): Record<string, unknown> | null {
  const id = vendaId.trim()
  if (!id) return null
  return PEDIDO_DELIVERY_DETALHE_CACHE.get(id) ?? null
}

export function salvarPedidoDeliveryDetalheCache(
  vendaId: string,
  raw: unknown
): Record<string, unknown> {
  const id = vendaId.trim()
  const registro = extrairRegistroPedidoDelivery(raw)
  if (!id) return registro
  PEDIDO_DELIVERY_DETALHE_CACHE.set(id, registro)
  return registro
}

export function invalidarPedidoDeliveryDetalheCache(vendaId: string): void {
  const id = vendaId.trim()
  if (!id) return
  PEDIDO_DELIVERY_DETALHE_CACHE.delete(id)
}

/** Segmento de queryKey React Query para detalhe de pedido delivery (após prefixo tenant). */
export const PEDIDO_DELIVERY_DETALHE_QUERY_SEGMENT = ['delivery', 'pedidos', 'detalhe'] as const

/**
 * Persiste pedido no cache em memória e, quando possível, no React Query
 * (`['tenant', empresaId, 'delivery', 'pedidos', 'detalhe', vendaId]`).
 */
export function syncPedidoDeliveryDetalheCaches(
  queryClient: import('@tanstack/react-query').QueryClient | undefined,
  tenantScopedListQueryKey: readonly unknown[],
  vendaId: string,
  raw: unknown
): Record<string, unknown> {
  const registro = salvarPedidoDeliveryDetalheCache(vendaId, raw)
  if (!queryClient) return registro

  const empresaId =
    tenantScopedListQueryKey[0] === 'tenant' && typeof tenantScopedListQueryKey[1] === 'string'
      ? tenantScopedListQueryKey[1]
      : null
  if (!empresaId) return registro

  queryClient.setQueryData(
    ['tenant', empresaId, ...PEDIDO_DELIVERY_DETALHE_QUERY_SEGMENT, vendaId.trim()],
    registro
  )
  return registro
}
