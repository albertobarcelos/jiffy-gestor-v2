import { IDeliveryRepository } from '@/src/domain/repositories/IDeliveryRepository'
import { StatusPedido } from '@/src/domain/entities/StatusPedido'

/**
 * Use case para avançar o status de um pedido
 */
export class AvancarStatusPedidoUseCase {
  constructor(private deliveryRepository: IDeliveryRepository) {}

  async execute(pedidoRef: string): Promise<{ status: StatusPedido }> {
    try {
      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      return await this.deliveryRepository.avancarStatus(pedidoRef)
    } catch (error) {
      throw new Error(
        `Erro ao avançar status do pedido: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )
    }
  }
}

