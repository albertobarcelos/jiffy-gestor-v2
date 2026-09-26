import { serializarPedidosDeliveryQueryParams } from '@/src/application/dto/api/pedidoDeliveryListQuery'
import type { PedidosDeliveryListResponse } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { PedidoDeliverySummaryApi } from '@/src/application/dto/api/pedidoDeliveryListApi'
import type { ApiClient } from '@/src/infrastructure/api/apiClient'

const PAGE_SIZE = 100
const MAX_PAGES = 200

/**
 * Lista FINALIZADO + CANCELADO do módulo delivery no mesmo período do dashboard.
 * Não substitui o fetch PDV — só devolve o que será somado depois.
 */
export async function buscarPedidosDeliveryPeriodoDashboard(input: {
  apiClient: ApiClient
  headers: HeadersInit
  inicioIso: string
  fimIso: string
}): Promise<PedidoDeliverySummaryApi[]> {
  const { apiClient, headers, inicioIso, fimIso } = input
  if (!inicioIso || !fimIso) return []

  const items: PedidoDeliverySummaryApi[] = []
  let offset = 0
  let total: number | null = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = serializarPedidosDeliveryQueryParams({
      offset,
      limit: PAGE_SIZE,
      statusDelivery: ['FINALIZADO', 'CANCELADO'],
      dataFinalizacaoInicial: inicioIso,
      dataFinalizacaoFinal: fimIso,
    })

    const response = await apiClient.request<PedidosDeliveryListResponse>(
      `/api/v1/delivery/pedidos?${qs.toString()}`,
      { method: 'GET', headers }
    )

    const data = response.data
    const pageItems = Array.isArray(data?.items) ? data.items : []
    items.push(...pageItems)

    if (typeof data?.count === 'number') total = data.count
    offset += pageItems.length

    if (pageItems.length === 0) break
    if (pageItems.length < PAGE_SIZE) break
    if (total != null && offset >= total) break
  }

  return items
}
