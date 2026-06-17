import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'
import {
  buildConfirmarCobrancasPendentesPedidoDeliveryPatch,
  extrairIdsCobrancasPendentesPedidoDelivery,
} from '@/src/application/mappers/CobrancaPedidoDeliveryPayloadMapper'

export class ConfirmarCobrancaPendentePedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(pedidoId: string, token: string): Promise<Record<string, unknown>> {
    const pedido = await this.repo.buscarPedidoDelivery(pedidoId, token)
    const cobrancaIdsPendentes = extrairIdsCobrancasPendentesPedidoDelivery(pedido)
    if (cobrancaIdsPendentes.length === 0) {
      throw new Error('Nenhuma cobrança pendente para confirmar.')
    }

    const patch = buildConfirmarCobrancasPendentesPedidoDeliveryPatch(cobrancaIdsPendentes)
    await this.repo.patchPedidoDelivery(
      pedidoId,
      token,
      patch as unknown as Record<string, unknown>
    )

    return this.repo.buscarPedidoDelivery(pedidoId, token)
  }
}

export const confirmarCobrancaPendentePedidoDeliveryUseCase =
  new ConfirmarCobrancaPendentePedidoDeliveryUseCase()
