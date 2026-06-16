import { ApiClient, ApiError } from '@/src/infrastructure/api/apiClient'

function extrairPayloadPedidoDelivery(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  if (o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)) {
    return o.data as Record<string, unknown>
  }
  return o
}

/**
 * Enriquece itens `venda_gestor` do unificado: a view SQL omite `tipo_venda` e etapa delivery.
 * Para cada id, tenta GET delivery/pedidos/{id}; se 404, assume balcão gestor.
 */
export async function enrichUnificadoItemsComModuloDelivery(
  items: unknown[],
  token: string
): Promise<unknown[]> {
  if (!Array.isArray(items) || items.length === 0) return items

  const precisaEnriquecer: Array<{ index: number; id: string }> = []
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const o = item as Record<string, unknown>
    if (o.tabelaOrigem !== 'venda_gestor') return
    const id = String(o.id ?? '').trim()
    if (!id) return
    const tipo = String(o.tipoVenda ?? '').trim().toLowerCase()
    if (!tipo || tipo === 'delivery') {
      precisaEnriquecer.push({ index, id })
    }
  })

  if (precisaEnriquecer.length === 0) return items

  const apiClient = new ApiClient()
  const deliveryPorId = new Map<string, { tipoEntrega: string; statusDelivery: string }>()

  await Promise.all(
    precisaEnriquecer.map(async ({ id }) => {
      try {
        const response = await apiClient.request<unknown>(
          `/api/v1/delivery/pedidos/${encodeURIComponent(id)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }
        )
        const pedido = extrairPayloadPedidoDelivery(response.data)
        if (!pedido) return
        const tipoEntrega = String(pedido.tipoEntrega ?? '').trim().toLowerCase()
        if (!tipoEntrega) return
        const statusDelivery = String(pedido.statusDelivery ?? '').trim()
        deliveryPorId.set(id, { tipoEntrega, statusDelivery })
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return
        console.warn('[unificado] enrich delivery pedido', id, error)
      }
    })
  )

  return items.map((item, index) => {
    const match = precisaEnriquecer.find(p => p.index === index)
    if (!match) return item
    if (!item || typeof item !== 'object') return item
    const o = item as Record<string, unknown>
    const extra = deliveryPorId.get(match.id)
    if (extra) {
      return {
        ...o,
        tipoVenda: extra.tipoEntrega,
        statusDelivery: extra.statusDelivery,
        statusEtapaOperacional: extra.statusDelivery,
      }
    }
    const tipo = String(o.tipoVenda ?? '').trim().toLowerCase()
    if (!tipo) {
      return { ...o, tipoVenda: 'balcao' }
    }
    return item
  })
}
