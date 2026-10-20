import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'

export class EmitirNotaPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(pedidoId: string, token: string, modelo: 55 | 65) {
    return this.repo.emitirNotaPedidoDelivery(pedidoId, token, modelo)
  }
}
