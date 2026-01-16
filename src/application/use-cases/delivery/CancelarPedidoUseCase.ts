import { IDeliveryRepository } from '@/src/domain/repositories/IDeliveryRepository'
import { StatusPedido } from '@/src/domain/entities/StatusPedido'

/**
 * Use case para cancelar um pedido
 */
export class CancelarPedidoUseCase {
  constructor(private deliveryRepository: IDeliveryRepository) {}

  async execute(pedidoRef: string): Promise<{ status: StatusPedido }> {
    try {
      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      return await this.deliveryRepository.cancelarPedido(pedidoRef)
    } catch (error) {
      throw new Error(
        `Erro ao cancelar pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )
    }
  }
}

