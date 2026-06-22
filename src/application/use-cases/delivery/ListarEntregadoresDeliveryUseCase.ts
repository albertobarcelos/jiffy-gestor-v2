import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class ListarEntregadoresDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(token: string) {
    return this.repo.listarEntregadoresDelivery(token)
  }
}

export const listarEntregadoresDeliveryUseCase = new ListarEntregadoresDeliveryUseCase()
