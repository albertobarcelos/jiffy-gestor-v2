import type { CotacaoPedidoDeliveryBackendRequest } from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'

export interface ICotacaoPedidoDeliveryRepository {
  cotar(payload: CotacaoPedidoDeliveryBackendRequest, token: string): Promise<unknown>
}
