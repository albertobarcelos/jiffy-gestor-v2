import { ApiClient, ApiError, mensagemLegivelApiError } from '@/src/infrastructure/api/apiClient'
import type { CotacaoPedidoDeliveryBackendRequest } from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'
import type { ICotacaoPedidoDeliveryRepository } from '@/src/domain/repositories/ICotacaoPedidoDeliveryRepository'

export class CotacaoPedidoDeliveryRepository implements ICotacaoPedidoDeliveryRepository {
  constructor(private readonly api = new ApiClient()) {}

  async buscarSlugEmpresaDelivery(token: string): Promise<string> {
    try {
      const response = await this.api.request<{ slug?: unknown }>('/api/v1/delivery/empresas/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })
      const slug = String(response.data?.slug ?? '').trim()
      if (!slug) {
        throw new Error('Configure o slug do cardápio no hub Delivery para cotar a taxa.')
      }
      return slug
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new Error('Configure o cardápio delivery para cotar a taxa deste endereço.')
      }
      if (error instanceof ApiError) {
        throw new Error(mensagemLegivelApiError(error))
      }
      throw error
    }
  }

  async cotarPublico(payload: CotacaoPedidoDeliveryBackendRequest): Promise<unknown> {
    const response = await this.api.request<unknown>('/api/v1/delivery/cotacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    })
    return response.data
  }
}

export const cotacaoPedidoDeliveryRepository = new CotacaoPedidoDeliveryRepository()
