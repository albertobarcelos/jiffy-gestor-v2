import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'
import {
  buildAtualizarCobrancasPedidoDeliveryPatch,
  extrairIdsCobrancasAtivasPedidoDelivery,
  type PagamentoCobrancaPatchItem,
} from '@/src/application/mappers/CobrancaPedidoDeliveryPayloadMapper'

export class AtualizarCobrancasPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(
    pedidoId: string,
    token: string,
    pagamentos: PagamentoCobrancaPatchItem[],
    fluxoPagamentoEntrega: FluxoPagamentoEntrega
  ): Promise<void> {
    const pedido = await this.repo.buscarPedidoDelivery(pedidoId, token)
    const cobrancaIdsAtivas = extrairIdsCobrancasAtivasPedidoDelivery(pedido)
    const patch = buildAtualizarCobrancasPedidoDeliveryPatch({
      cobrancaIdsAtivas,
      pagamentos,
      fluxoPagamentoEntrega,
    })
    await this.repo.patchPedidoDelivery(
      pedidoId,
      token,
      patch as unknown as Record<string, unknown>
    )
  }
}

export const atualizarCobrancasPedidoDeliveryUseCase = new AtualizarCobrancasPedidoDeliveryUseCase()
