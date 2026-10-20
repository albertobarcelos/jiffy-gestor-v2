import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'

export class ListarEntregadoresDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(token: string) {
    return this.repo.listarEntregadoresDelivery(token)
  }
}
