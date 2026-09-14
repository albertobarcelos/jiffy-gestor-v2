import { ApiClient } from '@/src/infrastructure/api/apiClient'
import type { CotacaoPedidoDeliveryBackendRequest } from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'
import type { ICotacaoPedidoDeliveryRepository } from '@/src/domain/repositories/ICotacaoPedidoDeliveryRepository'

export class CotacaoPedidoDeliveryRepository implements ICotacaoPedidoDeliveryRepository {
  constructor(private readonly api = new ApiClient()) {}

  async cotar(payload: CotacaoPedidoDeliveryBackendRequest, token: string): Promise<unknown> {
    const response = await this.api.request<unknown>('/api/v1/delivery/cotacao', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return response.data
  }
}

export const cotacaoPedidoDeliveryRepository = new CotacaoPedidoDeliveryRepository()
