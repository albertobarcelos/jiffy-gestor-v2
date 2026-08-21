import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class EmitirNotaPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(pedidoId: string, token: string, modelo: 55 | 65, informacoesAdicionais?: string) {
    return this.repo.emitirNotaPedidoDelivery(pedidoId, token, modelo, informacoesAdicionais)
  }
}

export const emitirNotaPedidoDeliveryUseCase = new EmitirNotaPedidoDeliveryUseCase()
