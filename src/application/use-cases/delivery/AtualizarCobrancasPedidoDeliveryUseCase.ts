import type { INovoPedidoReadRepository } from '@/src/domain/repositories/INovoPedidoReadRepository'
import type { FluxoPagamentoEntrega } from '@/src/domain/types/vendaDetalhe'
import type { PagamentoSelecionado } from '@/src/domain/types/pedido'
import {
  buildAtualizarCobrancasPedidoDeliveryPatch,
  buildConfirmarCobrancasPendentesPedidoDeliveryPatch,
  cobrancasPatchTemOperacao,
  extrairIdsCobrancasAntecipadasAConfirmarPedidoDelivery,
  extrairIdsCobrancasAtivasPedidoDelivery,
  extrairIdsCobrancasPendentesPedidoDelivery,
} from '@/src/application/mappers/CobrancaPedidoDeliveryPayloadMapper'

export class AtualizarCobrancasPedidoDeliveryUseCase {
  constructor(private readonly repo: INovoPedidoReadRepository) {}

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
    const temPatch = cobrancasPatchTemOperacao(patch)
    if (temPatch) {
      await this.repo.patchPedidoDelivery(
        pedidoId,
        token,
        patch as unknown as Record<string, unknown>
      )
    }

    const pedidoApos = temPatch ? await this.repo.buscarPedidoDelivery(pedidoId, token) : pedido
    const antecipadasAConfirmar = extrairIdsCobrancasAntecipadasAConfirmarPedidoDelivery(pedidoApos)
    if (antecipadasAConfirmar.length > 0) {
      await this.repo.patchPedidoDelivery(
        pedidoId,
        token,
        buildConfirmarCobrancasPendentesPedidoDeliveryPatch(
          antecipadasAConfirmar
        ) as unknown as Record<string, unknown>
      )
      return true
    }

    return temPatch
  }
}
