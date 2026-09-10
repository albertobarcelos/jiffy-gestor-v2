import type { CotacaoPedidoDeliveryBackendRequest } from '@/src/application/dto/api/cotacaoPedidoDeliveryApi'

export interface ICotacaoPedidoDeliveryRepository {
  buscarSlugEmpresaDelivery(token: string): Promise<string>
  cotarPublico(payload: CotacaoPedidoDeliveryBackendRequest): Promise<unknown>
}
