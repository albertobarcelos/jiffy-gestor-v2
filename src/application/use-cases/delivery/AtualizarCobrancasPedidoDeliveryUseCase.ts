import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import { novoPedidoReadRepository } from '@/src/infrastructure/api/repositories/NovoPedidoReadRepository'
import {
  buildAtualizarCobrancasPedidoDeliveryPatch,
  buildConfirmarCobrancasPendentesPedidoDeliveryPatch,
  cobrancasPatchTemOperacao,
  extrairIdsCobrancasAtivasPedidoDelivery,
  extrairIdsCobrancasPendentesPedidoDelivery,
} from '@/src/application/mappers/CobrancaPedidoDeliveryPayloadMapper'

export class AtualizarCobrancasPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository = novoPedidoReadRepository) {}

  async execute(
    pedidoId: string,
    token: string,
    pagamentos: PagamentoSelecionado[],
    fluxoPagamentoEntrega: FluxoPagamentoEntrega
  ): Promise<boolean> {
    const pedido = await this.repo.buscarPedidoDelivery(pedidoId, token)
    const cobrancaIdsAtivas = extrairIdsCobrancasAtivasPedidoDelivery(pedido)
    const cobrancaIdsPendentes = extrairIdsCobrancasPendentesPedidoDelivery(pedido)
    const patch = buildAtualizarCobrancasPedidoDeliveryPatch({
      cobrancaIdsAtivas,
      cobrancaIdsPendentes,
      pagamentos,
      fluxoPagamentoEntrega,
    })
    if (!cobrancasPatchTemOperacao(patch)) {
      return false
    }
    await this.repo.patchPedidoDelivery(
      pedidoId,
      token,
      patch as unknown as Record<string, unknown>
    )

    if (fluxoPagamentoEntrega === 'ja_pago') {
      const pedidoAposPatch = await this.repo.buscarPedidoDelivery(pedidoId, token)
      const cobrancaIdsPendentesApos = extrairIdsCobrancasPendentesPedidoDelivery(pedidoAposPatch)
      if (cobrancaIdsPendentesApos.length > 0) {
        const confirmPatch = buildConfirmarCobrancasPendentesPedidoDeliveryPatch(
          cobrancaIdsPendentesApos
        )
        await this.repo.patchPedidoDelivery(
          pedidoId,
          token,
          confirmPatch as unknown as Record<string, unknown>
        )
      }
    }

    return true
  }
}

export const atualizarCobrancasPedidoDeliveryUseCase = new AtualizarCobrancasPedidoDeliveryUseCase()
