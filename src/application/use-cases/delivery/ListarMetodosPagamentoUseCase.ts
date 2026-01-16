import { IDeliveryRepository } from '@/src/domain/repositories/IDeliveryRepository'
import { MetodoPagamento } from '@/src/domain/entities/MetodoPagamento'

/**
 * Use case para listar métodos de pagamento disponíveis
 */
export class ListarMetodosPagamentoUseCase {
  constructor(private deliveryRepository: IDeliveryRepository) {}

  async execute(): Promise<MetodoPagamento[]> {
    try {
      return await this.deliveryRepository.listarMetodosPagamento()
    } catch (error) {
      throw new Error(
        `Erro ao listar métodos de pagamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      )
    }
  }
}

