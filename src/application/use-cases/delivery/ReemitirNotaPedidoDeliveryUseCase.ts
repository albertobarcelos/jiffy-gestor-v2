import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { numeroOpcionalReemitirNotaDelivery } from '@/src/domain/services/pedido/RegrasEmissaoFiscalDelivery'

export class ReemitirNotaPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

  execute(pedidoId: string, token: string, numero?: number) {
    return this.repo.reemitirNotaPedidoDelivery(
      pedidoId,
      token,
      numeroOpcionalReemitirNotaDelivery(numero)
    )
  }
}
