import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { numeroOpcionalReemitirNotaDelivery } from '@/src/domain/services/pedido/RegrasEmissaoFiscalDelivery'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'

export class ReemitirNotaPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  execute(pedidoId: string, token: string, numero?: number) {
    return this.repo.reemitirNotaPedidoDelivery(
      pedidoId,
      token,
      numeroOpcionalReemitirNotaDelivery(numero)
    )
  }
}

export const reemitirNotaPedidoDeliveryUseCase = new ReemitirNotaPedidoDeliveryUseCase()
