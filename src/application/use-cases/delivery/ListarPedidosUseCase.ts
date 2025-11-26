import { IDeliveryRepository, BuscarPedidosParams } from '@/src/domain/repositories/IDeliveryRepository'
import { PedidoDelivery } from '@/src/domain/entities/PedidoDelivery'

/**
 * Use case para listar pedidos de delivery
 */
export class ListarPedidosUseCase {
  constructor(private deliveryRepository: IDeliveryRepository) {}

  async execute(params?: BuscarPedidosParams): Promise<PedidoDelivery[]> {
    try {
      return await this.deliveryRepository.listarPedidos(params)
    } catch (error) {
      throw new Error(
        `Erro ao listar pedidos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )
    }
  }
}

