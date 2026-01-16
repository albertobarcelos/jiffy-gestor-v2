import { IDeliveryRepository } from '@/src/domain/repositories/IDeliveryRepository'

/**
 * Use case para enviar pedido para serviço de motoboy
 */
export class EnviarParaMotoboyUseCase {
  constructor(private deliveryRepository: IDeliveryRepository) {}

  async execute(
    pedidoRef: string,
    servico?: 'Pega Express' | 'Itz Express' | 'NextLeva'
  ): Promise<void> {
    try {
      if (!pedidoRef) {
        throw new Error('Referência do pedido é obrigatória')
      }

      await this.deliveryRepository.enviarParaMotoboy(pedidoRef, servico)
    } catch (error) {
      throw new Error(
        `Erro ao enviar pedido para motoboy: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )
    }
  }
}

