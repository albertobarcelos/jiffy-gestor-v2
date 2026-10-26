import {
  mapPedidoDeliveryPublicoParaConfirmado,
  type PedidoPublicoConfirmadoView,
} from '@/src/application/mappers/PedidoPublicoConfirmadoMapper'
import type { IPedidoPublicoPort } from '@/src/application/ports/delivery-publico'

export class ConsultarPedidoDeliveryPublicoUseCase {
  constructor(private readonly pedidoPort: IPedidoPublicoPort) {}

  async execute(id: string): Promise<PedidoPublicoConfirmadoView> {
    const idNormalizado = id.trim()
    if (!idNormalizado) {
      throw new Error('Id do pedido é obrigatório')
    }
    const pedido = await this.pedidoPort.consultar(idNormalizado)
    return mapPedidoDeliveryPublicoParaConfirmado(pedido)
  }
}
